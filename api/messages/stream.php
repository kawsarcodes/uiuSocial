<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();

/*
 * Server-Sent Events endpoint for live 1-on-1 chat.
 *
 * Chosen over WebSockets because it runs on stock Apache/PHP with no extra
 * daemon, and over long polling because it does not pin a request open per
 * unread message. The client reconnects automatically when the stream closes.
 *
 * IMPORTANT: the PHP session is closed before the loop. While a session file is
 * locked, every other request from the same browser is serialised behind it,
 * so a user with this stream open could not send their own messages.
 */

$me = (int) getCurrentUserId();
$afterId = (int) ($_GET['after_id'] ?? 0);
$peerFilter = (int) ($_GET['user_id'] ?? 0);

if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$db = getDB();

@ini_set('zlib.output_compression', 'Off');
@ini_set('output_buffering', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level() > 0) {
    ob_end_flush();
}
ignore_user_abort(false);

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

function sseSend($event, array $data) {
    echo "event: $event\n";
    echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();
}

sseSend('ready', ['user_id' => $me, 'after_id' => $afterId, 'at' => date('c')]);
echo "retry: 1500\n\n";
flush();

$deadline = time() + 60;
$lastMessageId = $afterId;
$lastReadAt = '1970-01-01 00:00:00';
$lastReadCheck = 0;

while (time() < $deadline) {
    if (connection_aborted()) {
        break;
    }

    try {
        $new = [];

        if ($peerFilter) {
            $stmt = $db->prepare(
                "SELECT * FROM messages
                  WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                    AND id > ?
                  ORDER BY id ASC LIMIT 50"
            );
            $stmt->execute([$me, $peerFilter, $peerFilter, $me, $lastMessageId]);
        } else {
            $stmt = $db->prepare("SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND id > ? ORDER BY id ASC LIMIT 50");
            $stmt->execute([$me, $me, $lastMessageId]);
        }

        foreach ($stmt->fetchAll() as $row) {
            $new[] = [
                'id' => (int) $row['id'],
                'sender_id' => (int) $row['sender_id'],
                'receiver_id' => (int) $row['receiver_id'],
                'peer_id' => (int) $row['sender_id'] === $me ? (int) $row['receiver_id'] : (int) $row['sender_id'],
                'content' => $row['content'],
                'message_type' => $row['message_type'],
                'file_name' => $row['file_name'],
                'file_size' => $row['file_size'],
                'file_mime' => $row['file_mime'],
                'reply_to' => $row['reply_to'] !== null ? (int) $row['reply_to'] : null,
                'is_read' => (int) $row['is_read'],
                'created_at' => $row['created_at'],
                'time' => date('h:i A', strtotime($row['created_at'])),
                'day' => date('Y-m-d', strtotime($row['created_at'])),
                'mine' => (int) $row['sender_id'] === $me,
            ];
            $lastMessageId = max($lastMessageId, (int) $row['id']);
        }

        if ($new) {
            $replyIds = [];
            foreach ($new as $n) {
                if (!empty($n['reply_to'])) $replyIds[(int) $n['reply_to']] = true;
            }
            $snips = [];
            if ($replyIds) {
                $ph = implode(',', array_fill(0, count($replyIds), '?'));
                $rs = $db->prepare("SELECT id, content, file_name FROM messages WHERE id IN ($ph)");
                $rs->execute(array_keys($replyIds));
                foreach ($rs->fetchAll() as $q) {
                    $snips[(int) $q['id']] = $q['content'] ?: ($q['file_name'] ? 'Attachment' : '');
                }
            }
            foreach ($new as &$n) {
                $n['reply_to'] = $n['reply_to'] !== null ? (int) $n['reply_to'] : null;
                $n['reply_snippet'] = $n['reply_to'] ? ($snips[$n['reply_to']] ?? null) : null;
            }
            unset($n);

            foreach ($new as $msg) {
                sseSend('message', $msg);
            }
            sseSend('refresh', ['reason' => 'messages', 'at' => time()]);
        }

        // Read receipts: report messages the other side has read since we last looked.
        // message_reads carries a per-user read_at, so it is the only reliable signal.
        if ($peerFilter && time() - $lastReadCheck >= 2) {
            $lastReadCheck = time();
            $readStmt = $db->prepare(
                "SELECT mr.message_id, mr.read_at
                   FROM message_reads mr
                   JOIN messages m ON m.id = mr.message_id
                  WHERE mr.user_id = ? AND m.sender_id = ? AND mr.read_at > ?
                  ORDER BY mr.read_at ASC LIMIT 50"
            );
            $readStmt->execute([$peerFilter, $me, $lastReadAt]);
            $newlyRead = $readStmt->fetchAll();
            if ($newlyRead) {
                sseSend('read', [
                    'peer_id' => $peerFilter,
                    'ids' => array_map(fn($r) => (int) $r['message_id'], $newlyRead),
                ]);
                foreach ($newlyRead as $r) {
                    $lastReadAt = max($lastReadAt, (string) $r['read_at']);
                }
            }
        }

        // Heartbeat keeps proxies and the browser from dropping an idle stream.
        echo ": ping " . time() . "\n\n";
        flush();
    } catch (PDOException $e) {
        error_log('stream.php: ' . $e->getMessage());
        sseSend('error', ['message' => 'Stream error']);
        break;
    }

    usleep(700000);
}

sseSend('bye', ['after_id' => $lastMessageId]);
exit;
