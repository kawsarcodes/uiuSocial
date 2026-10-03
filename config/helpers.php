<?php
require_once __DIR__ . '/session.php';

function getJsonInput() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function isAdmin($user = null) {
    $user = $user ?? getCurrentUser();
    return $user && strtolower($user['role']) === 'admin';
}

function isFaculty($user = null) {
    $user = $user ?? getCurrentUser();
    return $user && strtolower($user['role']) === 'faculty';
}

function isGroupModerator($user = null) {
    $user = $user ?? getCurrentUser();
    return $user && (isAdmin($user) || isFaculty($user));
}

function isGuestUser($user = null) {
    $user = $user ?? getCurrentUser();
    return $user && strtolower($user['role']) === 'guest';
}

function isApprovedMember($user = null) {
    $user = $user ?? getCurrentUser();
    if (!$user) return false;
    if (strtolower($user['role']) === 'guest') return false;
    $status = $user['status'] ?? 'approved';
    return $status === 'approved';
}

function canAct($user = null) {
    return isApprovedMember($user);
}

function requireCanAct() {
    requireLogin();
    if (!canAct()) {
        jsonResponse(['error' => 'Only approved students and faculty can perform this action.'], 403);
    }
}

function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        jsonResponse(['error' => 'Admin access required'], 403);
    }
}

function logAdminAction($action, $targetType, $targetId, $details = null) {
    try {
        $stmt = getDB()->prepare("INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([getCurrentUserId(), $action, $targetType, (int) $targetId, $details]);
    } catch (Exception $e) {
        error_log('logAdminAction: ' . $e->getMessage());
    }
}

function columnExists(PDO $db, $table, $column) {
    $stmt = $db->prepare("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetch();
}

function tableExists(PDO $db, $table) {
    $stmt = $db->prepare("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
    $stmt->execute([$table]);
    return (bool) $stmt->fetch();
}

function adminLogTargetName(PDO $db, $targetType, $targetId) {
    $queries = [
        'user' => "SELECT name FROM users WHERE id = ?",
        'post' => "SELECT u.name FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
        'comment' => "SELECT u.name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
        'club_post' => "SELECT u.name FROM club_posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
        'club_comment' => "SELECT u.name FROM club_post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
        'announcement' => "SELECT u.name FROM announcements a JOIN users u ON u.id = a.created_by WHERE a.id = ?",
        'announcement_comment' => "SELECT u.name FROM announcement_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
    ];
    if (!isset($queries[$targetType])) return null;
    try {
        $stmt = $db->prepare($queries[$targetType]);
        $stmt->execute([$targetId]);
        $row = $stmt->fetch();
        return $row['name'] ?? null;
    } catch (Exception $e) {
        return null;
    }
}

function deleteCommentTree(PDO $db, $commentId) {    $stmt = $db->prepare("SELECT id FROM comments WHERE parent_id = ?");
    $stmt->execute([$commentId]);
    foreach ($stmt->fetchAll() as $child) {
        deleteCommentTree($db, (int) $child['id']);
    }
    if (tableExists($db, 'comment_likes')) {
        $db->prepare("DELETE FROM comment_likes WHERE comment_id = ?")->execute([$commentId]);
    }
    $db->prepare("DELETE FROM comments WHERE id = ?")->execute([$commentId]);
}

function deleteCommentsForPost(PDO $db, $postId) {
    $stmt = $db->prepare("
        SELECT c.id FROM comments c
        WHERE c.post_id = ?
          AND NOT EXISTS (SELECT 1 FROM comments x WHERE x.id = c.parent_id)
    ");
    $stmt->execute([$postId]);
    foreach ($stmt->fetchAll() as $row) {
        deleteCommentTree($db, (int) $row['id']);
    }
}

function uploadImage($fileKey, $subdir) {
    if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $uploadDir = __DIR__ . '/../uploads/' . trim($subdir, '/') . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $fileInfo = pathinfo($_FILES[$fileKey]['name']);
    $extension = strtolower($fileInfo['extension'] ?? '');
    if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
        return null;
    }
    $newFilename = uniqid($subdir . '_') . '.' . $extension;
    $destination = $uploadDir . $newFilename;
    if (move_uploaded_file($_FILES[$fileKey]['tmp_name'], $destination)) {
        return 'uploads/' . trim($subdir, '/') . '/' . $newFilename;
    }
    return null;
}

/**
 * Allowlist for private chat attachments, keyed by the MIME type that
 * finfo actually reports for the bytes on disk. The client-supplied type and
 * the original filename are never trusted for this decision.
 * SVG is deliberately excluded: it can carry script and is served inline.
 */
function chatAttachmentRules() {
    return [
        // images
        'image/jpeg' => ['ext' => 'jpg', 'kind' => 'image', 'max' => 5 * 1024 * 1024],
        'image/png'  => ['ext' => 'png', 'kind' => 'image', 'max' => 5 * 1024 * 1024],
        'image/gif'  => ['ext' => 'gif', 'kind' => 'image', 'max' => 5 * 1024 * 1024],
        'image/webp' => ['ext' => 'webp', 'kind' => 'image', 'max' => 5 * 1024 * 1024],
        // documents
        'application/pdf' => ['ext' => 'pdf', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/msword' => ['ext' => 'doc', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['ext' => 'docx', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/vnd.ms-excel' => ['ext' => 'xls', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['ext' => 'xlsx', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/vnd.ms-powerpoint' => ['ext' => 'ppt', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => ['ext' => 'pptx', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/zip' => ['ext' => 'zip', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'application/x-zip-compressed' => ['ext' => 'zip', 'kind' => 'file', 'max' => 10 * 1024 * 1024],
        'text/plain' => ['ext' => 'txt', 'kind' => 'file', 'max' => 5 * 1024 * 1024],
        'text/csv' => ['ext' => 'csv', 'kind' => 'file', 'max' => 5 * 1024 * 1024],
    ];
}

function humanFileSize($bytes) {
    $bytes = (int) $bytes;
    if ($bytes < 1024) return $bytes . ' B';
    if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
    return round($bytes / 1048576, 1) . ' MB';
}

function chatUploadDir() {
    $dir = __DIR__ . '/../uploads/chat/';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    return realpath($dir) ?: null;
}

/**
 * Validates and stores a private chat attachment.
 *
 * Returns ['ok' => true, ...] or ['ok' => false, 'error' => '...'].
 * The stored filename is random and its extension comes from the sniffed
 * MIME type, so a file called "shell.php.png" cannot keep a script name.
 */
function storeChatAttachment($fileKey) {
    if (!isset($_FILES[$fileKey]) || !$_FILES[$fileKey] || $_FILES[$fileKey]['error'] === UPLOAD_ERR_NO_FILE) {
        return ['ok' => false, 'error' => 'No file selected'];
    }
    $file = $_FILES[$fileKey];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $codes = [
            UPLOAD_ERR_INI_SIZE => 'File is larger than the server allows',
            UPLOAD_ERR_FORM_SIZE => 'File is larger than the form allows',
            UPLOAD_ERR_PARTIAL => 'Upload was interrupted, please retry',
            UPLOAD_ERR_NO_TMP_DIR => 'Server has no temp folder for uploads',
            UPLOAD_ERR_CANT_WRITE => 'Server could not write the file',
            UPLOAD_ERR_EXTENSION => 'Upload was blocked by a server extension',
        ];
        return ['ok' => false, 'error' => $codes[$file['error']] ?? 'Upload failed'];
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        return ['ok' => false, 'error' => 'Invalid upload'];
    }
    if (!function_exists('finfo_open')) {
        return ['ok' => false, 'error' => 'Server cannot verify file types'];
    }

    $size = (int) $file['size'];
    if ($size <= 0) return ['ok' => false, 'error' => 'File is empty'];

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = strtolower(trim((string) finfo_file($finfo, $file['tmp_name'])));
    finfo_close($finfo);

    $rules = chatAttachmentRules();
    if (!isset($rules[$mime])) {
        return ['ok' => false, 'error' => 'That file type is not allowed (detected ' . ($mime ?: 'unknown') . ')'];
    }
    $rule = $rules[$mime];
    if ($size > $rule['max']) {
        return ['ok' => false, 'error' => $rule['kind'] === 'image'
            ? 'Images must be under ' . humanFileSize($rule['max'])
            : 'Documents must be under ' . humanFileSize($rule['max'])];
    }

    // Second opinion for images: a real decoder must be able to read the header,
    // which rejects text files renamed to .png and other polyglot tricks.
    if ($rule['kind'] === 'image') {
        $info = @getimagesize($file['tmp_name']);
        if ($info === false || empty($info['mime']) || strtolower($info['mime']) !== $mime) {
            return ['ok' => false, 'error' => 'That image could not be verified'];
        }
    }
    if ($mime === 'application/pdf') {
        $fh = fopen($file['tmp_name'], 'rb');
        $magic = $fh ? fread($fh, 5) : '';
        if ($fh) fclose($fh);
        if ($magic !== '%PDF-') {
            return ['ok' => false, 'error' => 'That PDF could not be verified'];
        }
    }

    $dir = chatUploadDir();
    if (!$dir) return ['ok' => false, 'error' => 'Attachment storage is unavailable'];

    $name = bin2hex(random_bytes(16)) . '.' . $rule['ext'];
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return ['ok' => false, 'error' => 'Could not save the attachment'];
    }
    @chmod($dest, 0644);

    // Display name is cosmetic only: strip control characters and path hints.
    $display = basename(str_replace('\\', '/', (string) $file['name']));
    $display = preg_replace('/[\x00-\x1F\x7F]/u', '', $display);
    $display = trim((string) $display) ?: 'attachment';

    return [
        'ok' => true,
        'path' => 'uploads/chat/' . $name,
        'mime' => $mime,
        'kind' => $rule['kind'],
        'name' => mb_substr($display, 0, 200),
        'size' => humanFileSize($size),
    ];
}

function notificationIconClass($type) {
    $map = [
        'connection_request' => 'fa-solid fa-user-plus',
        'connection_accepted' => 'fa-solid fa-user-check',
        'connection_declined' => 'fa-solid fa-user-xmark',
        'connection_removed' => 'fa-solid fa-user-minus',
        'follow' => 'fa-solid fa-user-plus',
        'unfollow' => 'fa-solid fa-user-minus',
        'like_post' => 'fa-solid fa-heart',
        'like_comment' => 'fa-solid fa-heart',
        'like_club_post' => 'fa-solid fa-heart',
        'like_announcement' => 'fa-solid fa-heart',
        'comment_post' => 'fa-solid fa-comment',
        'comment_club_post' => 'fa-solid fa-comment',
        'comment_announcement' => 'fa-solid fa-comment',
        'reply_comment' => 'fa-solid fa-reply',
        'reply_reply' => 'fa-solid fa-reply',
        'new_post' => 'fa-solid fa-newspaper',
        'new_club_post' => 'fa-solid fa-newspaper',
        'new_announcement' => 'fa-solid fa-bullhorn',
        'event_rsvp' => 'fa-solid fa-calendar-check',
        'event_update' => 'fa-solid fa-calendar-day',
        'message' => 'fa-solid fa-envelope',
        'group_join_request' => 'fa-solid fa-user-group',
        'group_join_approved' => 'fa-solid fa-circle-check',
        'group_join_rejected' => 'fa-solid fa-circle-xmark',
        'group_removed' => 'fa-solid fa-user-minus',
        'club_join_request' => 'fa-solid fa-puzzle-piece',
        'club_join_approved' => 'fa-solid fa-circle-check',
        'club_join_rejected' => 'fa-solid fa-circle-xmark',
        'club_removed' => 'fa-solid fa-user-minus',
        'post_edited' => 'fa-solid fa-pen',
        'post_deleted' => 'fa-solid fa-trash',
        'comment_deleted' => 'fa-solid fa-comment-slash',
        'content_removed' => 'fa-solid fa-trash',
        'join_request' => 'fa-solid fa-user-shield',
        'join_approved' => 'fa-solid fa-circle-check',
        'join_rejected' => 'fa-solid fa-circle-xmark',
        'report' => 'fa-solid fa-flag',
        'report_resolved' => 'fa-solid fa-shield-halved',
    ];
    $map['post_edit'] = $map['post_edited'];
    $map['connection'] = $map['connection_request'];
    $map['club_join'] = $map['club_join_request'];
    $map['club_join_approved'] = $map['club_join_approved'];
    $map['club_join_rejected'] = $map['club_join_rejected'];
    $map['group_join'] = $map['group_join_request'];
    $map['join'] = $map['join_approved'];
    return $map[$type] ?? 'fa-solid fa-bell';
}

function notificationIconColor($type) {
    if (strpos($type, 'like_') === 0) return '#e0245e';
    if (strpos($type, 'message') !== false) return '#0ea5e9';
    if (strpos($type, 'rejected') !== false || strpos($type, 'declined') !== false || strpos($type, 'removed') !== false || $type === 'post_deleted' || $type === 'comment_deleted') return '#dc3545';
    if (strpos($type, 'request') !== false) return '#f59e0b';
    if (strpos($type, 'approved') !== false || strpos($type, 'accepted') !== false) return '#16a34a';
    if (strpos($type, 'report') !== false) return '#dc3545';
    return 'var(--primary-color)';
}

function notifyUser($userId, $type, $title, $body, $link = null, $actorId = null) {
    $userId = (int) $userId;
    if ($userId <= 0) return;
    if ($actorId && (int) $actorId === $userId) return;
    $title = mb_substr((string) $title, 0, 200);
    try {
        $db = getDB();
        try {
            $stmt = $db->prepare("INSERT INTO notifications (user_id, actor_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $actorId ?: null, $type, $title, $body, $link]);
        } catch (PDOException $e) {
            $stmt = $db->prepare("INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $type, $title, $body, $link]);
        }
    } catch (Exception $e) {
        error_log('notifyUser: ' . $e->getMessage());
    }
}

function notifyAdmins($type, $title, $body, $link = null, $actorId = null) {
    try {
        $db = getDB();
        $stmt = $db->query("SELECT id FROM users WHERE role = 'admin'");
        foreach ($stmt->fetchAll() as $admin) {
            notifyUser($admin['id'], $type, $title, $body, $link, $actorId);
        }
    } catch (Exception $e) {
        error_log('notifyAdmins: ' . $e->getMessage());
    }
}

function userDisplayName($userId) {
    static $cache = [];
    $userId = (int) $userId;
    if (!$userId) return 'Someone';
    if (isset($cache[$userId])) return $cache[$userId];
    $name = null;
    try {
        $stmt = getDB()->prepare("SELECT name FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if ($row && !empty($row['name'])) $name = $row['name'];
    } catch (Exception $e) {}
    $cache[$userId] = $name ?: 'Someone';
    return $cache[$userId];
}

function notificationSnippet($text, $limit = 90) {
    $text = trim(preg_replace('/\s+/', ' ', (string) $text));
    if ($text === '') return '';
    if (mb_strlen($text) <= $limit) return $text;
    return mb_substr($text, 0, $limit) . '…';
}

function postNotificationLink(array $ctx) {
    $postId = (int) ($ctx['post_id'] ?? 0);
    $groupId = (int) ($ctx['group_id'] ?? 0);
    $clubId = (int) ($ctx['club_id'] ?? 0);
    if ($clubId) return 'club_detail.html?id=' . $clubId . ($postId ? '#post-' . $postId : '');
    if ($groupId) return 'group_detail.html?id=' . $groupId . ($postId ? '#post-' . $postId : '');
    return 'index.html' . ($postId ? '#post-' . $postId : '');
}

function notificationTemplate($type, $actorName, array $ctx = []) {
    $actorId = (int) ($ctx['actor_id'] ?? 0);
    $profile = $actorId ? 'profile.html?id=' . $actorId : 'index.html';
    $snippet = notificationSnippet($ctx['snippet'] ?? '');
    $tail = $snippet !== '' ? ' "' . $snippet . '"' : '';
    $groupName = $ctx['group_name'] ?? 'the group';
    $clubName = $ctx['club_name'] ?? 'the club';
    $eventName = $ctx['event_name'] ?? 'your event';
    $item = $ctx['item_name'] ?? 'your post';

    $make = function ($title, $body, $link) {
        return ['title' => $title, 'body' => $body, 'link' => $link];
    };

    switch ($type) {
        case 'connection_request':
            return $make('New connection request', $actorName . ' wants to connect with you.', $profile);
        case 'connection_accepted':
            return $make('Connection accepted', $actorName . ' accepted your connection request.', $profile);
        case 'connection_declined':
            return $make('Connection request declined', $actorName . ' declined your connection request.', $profile);
        case 'connection_removed':
            return $make('Connection removed', $actorName . ' removed you from their connections.', $profile);
        case 'follow':
            return $make('New follower', $actorName . ' started following you.', $profile);
        case 'unfollow':
            return $make('Unfollowed', $actorName . ' no longer follows you.', $profile);

        case 'like_post':
        case 'like_club_post':
        case 'like_announcement':
            return $make('New like', $actorName . ' liked ' . $item . $tail . '.', postNotificationLink($ctx));
        case 'like_comment':
            return $make('New like on your comment', $actorName . ' liked your comment' . $tail . '.', postNotificationLink($ctx));

        case 'comment_post':
            return $make('New comment', $actorName . ' commented on ' . $item . $tail . '.', postNotificationLink($ctx));
        case 'comment_club_post':
        case 'comment_announcement':
            return $make('New comment', $actorName . ' commented' . $tail . '.', postNotificationLink($ctx));
        case 'reply_comment':
            return $make('New reply', $actorName . ' replied to your comment' . $tail . '.', postNotificationLink($ctx));
        case 'reply_reply':
            return $make('New reply', $actorName . ' replied to you' . $tail . '.', postNotificationLink($ctx));

        case 'new_post':
            return $make('New post', $actorName . ' shared a new post' . $tail . '.', postNotificationLink($ctx));
        case 'new_club_post':
            return $make('New club post', $actorName . ' posted in ' . $clubName . $tail . '.', 'club_detail.html?id=' . (int) ($ctx['club_id'] ?? 0));
        case 'new_announcement':
            $clubId = (int) ($ctx['club_id'] ?? 0);
            if ($clubId > 0) {
                return $make('New announcement', $actorName . ' posted an announcement in ' . $clubName . '.', 'club_detail.html?id=' . $clubId);
            }
            return $make('New announcement', $actorName . ' posted a new announcement.', 'announcements.html');

        case 'event_rsvp':
            return $make('Event RSVP', $actorName . ' is going to ' . $eventName . '.', 'event_detail.html?id=' . (int) ($ctx['event_id'] ?? 0));
        case 'event_update':
            return $make('Event update', $actorName . ' updated ' . $eventName . '.', 'event_detail.html?id=' . (int) ($ctx['event_id'] ?? 0));

        case 'message':
            return $make('New message', $actorName . ' sent you a message' . $tail . '.', 'messages.html?user=' . $actorId);

        case 'group_join_request':
            return $make('Group join request', $actorName . ' requested to join ' . $groupName . '.', 'group_detail.html?id=' . (int) ($ctx['group_id'] ?? 0));
        case 'group_join_approved':
            return $make('Group request approved', 'Your request to join ' . $groupName . ' was approved.', 'group_detail.html?id=' . (int) ($ctx['group_id'] ?? 0));
        case 'group_join_rejected':
            return $make('Group request declined', 'Your request to join ' . $groupName . ' was declined.', 'group_detail.html?id=' . (int) ($ctx['group_id'] ?? 0));
        case 'group_removed':
            return $make('Removed from group', $actorName . ' removed you from ' . $groupName . '.', 'groups.html');

        case 'club_join_request':
            return $make('Club join request', $actorName . ' requested to join ' . $clubName . '.', 'club_detail.html?id=' . (int) ($ctx['club_id'] ?? 0));
        case 'club_join_approved':
            return $make('Club request approved', 'Your request to join ' . $clubName . ' was approved.', 'club_detail.html?id=' . (int) ($ctx['club_id'] ?? 0));
        case 'club_join_rejected':
            return $make('Club request declined', 'Your request to join ' . $clubName . ' was declined.', 'club_detail.html?id=' . (int) ($ctx['club_id'] ?? 0));
        case 'club_removed':
            return $make('Removed from club', $actorName . ' removed you from ' . $clubName . '.', 'club_hub.html');

        case 'post_edited':
            return $make('Post updated', $actorName . ' edited ' . $item . $tail . '.', postNotificationLink($ctx));
        case 'post_deleted':
            return $make('Post removed', 'Your post was removed by ' . $actorName . '.', 'index.html');
        case 'comment_deleted':
            return $make('Comment removed', 'Your comment was removed by ' . $actorName . '.', $item);
        case 'content_removed':
            return $make('Content removed', 'Your ' . $item . ' was removed by ' . $actorName . '.', 'index.html');

        case 'join_request':
            return $make('New joining request', $actorName . ' requested to join as ' . ($ctx['requested_role'] ?? 'student') . '.', 'admin.html');
        case 'join_approved':
            return $make('Account approved', 'Welcome to UIU Social! Your account is approved.', 'index.html');
        case 'join_rejected':
            return $make('Account declined', 'Your joining request was not approved.', 'login.html');
        case 'report':
            return $make('New report', $actorName . ' reported a post for ' . ($ctx['reason'] ?? 'review') . '.', 'admin.html');
        case 'report_resolved':
            return $make('Report resolved', 'Your report was reviewed by an admin.', 'index.html');
        default:
            return $make('Update', $actorName . ' triggered a new update.', $profile);
    }
}

function notifyActivity($type, $actorId, $recipients, array $ctx = []) {
    $actorId = (int) $actorId;
    $ids = [];
    foreach ((array) $recipients as $r) {
        $r = (int) $r;
        if ($r > 0) $ids[$r] = true;
    }
    unset($ids[$actorId]);
    if (!$ids) return;
    $actorName = $ctx['actor_name'] ?? ($actorId ? userDisplayName($actorId) : 'UIU Social');
    $ctx['actor_id'] = $actorId;
    $tpl = notificationTemplate($type, $actorName, $ctx);
    foreach (array_keys($ids) as $rid) {
        notifyUser($rid, $type, $tpl['title'], $tpl['body'], $tpl['link'], $actorId ?: null);
    }
}

function followerIds($userId) {
    try {
        $stmt = getDB()->prepare("SELECT follower_id FROM follows WHERE following_id = ?");
        $stmt->execute([(int) $userId]);
        return array_map(fn($r) => (int) $r['follower_id'], $stmt->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function followingIds($userId) {
    try {
        $stmt = getDB()->prepare("SELECT following_id FROM follows WHERE follower_id = ?");
        $stmt->execute([(int) $userId]);
        return array_map(fn($r) => (int) $r['following_id'], $stmt->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function groupMemberIds($groupId) {
    try {
        $stmt = getDB()->prepare("SELECT user_id FROM group_members WHERE group_id = ? AND role != 'requested'");
        $stmt->execute([(int) $groupId]);
        return array_map(fn($r) => (int) $r['user_id'], $stmt->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function clubMemberIds($clubId) {
    try {
        $stmt = getDB()->prepare("SELECT user_id FROM club_members WHERE club_id = ? AND role != 'requested'");
        $stmt->execute([(int) $clubId]);
        return array_map(fn($r) => (int) $r['user_id'], $stmt->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function eventAttendeeIds($eventId) {
    try {
        $stmt = getDB()->prepare("SELECT user_id FROM event_rsvps WHERE event_id = ?");
        $stmt->execute([(int) $eventId]);
        return array_map(fn($r) => (int) $r['user_id'], $stmt->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function adminIds() {
    try {
        return array_map(fn($r) => (int) $r['id'], getDB()->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll());
    } catch (Exception $e) {
        return [];
    }
}

function isGroupManager($groupId, $user = null) {
    $user = $user ?? getCurrentUser();
    if (!$user) return false;
    if (isAdmin($user)) return true;
    $db = getDB();
    $stmt = $db->prepare("SELECT created_by FROM groups_table WHERE id = ?");
    $stmt->execute([$groupId]);
    $group = $stmt->fetch();
    if ($group && (int) $group['created_by'] === (int) $user['id']) {
        return true;
    }
    $stmt = $db->prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?");
    $stmt->execute([$groupId, $user['id']]);
    $row = $stmt->fetch();
    return $row && $row['role'] === 'admin';
}

function isClubManager($clubId, $user = null) {
    $user = $user ?? getCurrentUser();
    if (!$user) return false;
    if (isAdmin($user)) return true;
    $db = getDB();
    $stmt = $db->prepare("SELECT owner_id FROM clubs WHERE id = ?");
    $stmt->execute([$clubId]);
    $club = $stmt->fetch();
    if ($club && (int) $club['owner_id'] === (int) $user['id']) {
        return true;
    }
    $stmt = $db->prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?");
    $stmt->execute([$clubId, $user['id']]);
    $row = $stmt->fetch();
    return $row && in_array($row['role'], ['admin', 'owner'], true);
}
