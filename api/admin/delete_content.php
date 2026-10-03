<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

$data = json_decode(file_get_contents('php://input'), true);
$type = trim($data['type'] ?? '');
$id = (int) ($data['id'] ?? 0);
$reason = trim($data['reason'] ?? '');

$types = ['post', 'comment', 'club_post', 'club_comment', 'announcement', 'announcement_comment'];
if (!in_array($type, $types, true)) jsonResponse(['error' => 'Unsupported content type'], 400);
if ($id <= 0) jsonResponse(['error' => 'Content ID required'], 400);

$db = getDB();
$adminId = getCurrentUserId();

switch ($type) {
    case 'post':
        $stmt = $db->prepare("SELECT user_id, group_id, content FROM posts WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Post not found'], 404);
        $owner = (int) $row['user_id'];
        $context = $row['group_id'] ? 'in a department group' : 'on the main feed';
        if (tableExists($db, 'comments')) {
            deleteCommentsForPost($db, $id);
        }
        if (tableExists($db, 'post_likes')) $db->prepare("DELETE FROM post_likes WHERE post_id = ?")->execute([$id]);
        if (tableExists($db, 'post_saves')) $db->prepare("DELETE FROM post_saves WHERE post_id = ?")->execute([$id]);
        if (tableExists($db, 'reports')) $db->prepare("DELETE FROM reports WHERE post_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM posts WHERE id = ?")->execute([$id]);
        $label = 'post';
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $row['content'])), 0, 120);
        break;

    case 'comment':
        $stmt = $db->prepare("SELECT user_id, post_id, parent_id, content FROM comments WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Comment not found'], 404);
        $owner = (int) $row['user_id'];
        deleteCommentTree($db, $id);
        $label = 'comment';
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $row['content'])), 0, 120);
        $context = 'on post #' . (int) $row['post_id'];
        break;

    case 'club_post':
        if (!tableExists($db, 'club_posts')) jsonResponse(['error' => 'Club posts are not available'], 404);
        $stmt = $db->prepare("SELECT user_id, content FROM club_posts WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Club post not found'], 404);
        $owner = (int) $row['user_id'];
        if (tableExists($db, 'club_post_comments')) $db->prepare("DELETE FROM club_post_comments WHERE post_id = ?")->execute([$id]);
        if (tableExists($db, 'club_post_likes')) $db->prepare("DELETE FROM club_post_likes WHERE post_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM club_posts WHERE id = ?")->execute([$id]);
        $label = 'club post';
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $row['content'])), 0, 120);
        $context = 'in a club';
        break;

    case 'club_comment':
        if (!tableExists($db, 'club_post_comments')) jsonResponse(['error' => 'Club comments are not available'], 404);
        $stmt = $db->prepare("SELECT user_id, post_id, content FROM club_post_comments WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Club comment not found'], 404);
        $owner = (int) $row['user_id'];
        $db->prepare("DELETE FROM club_post_comments WHERE id = ?")->execute([$id]);
        $label = 'club comment';
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $row['content'])), 0, 120);
        $context = 'on a club post';
        break;

    case 'announcement':
        $stmt = $db->prepare("SELECT created_by, club_id, title, content FROM announcements WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Announcement not found'], 404);
        $owner = (int) ($row['created_by'] ?? 0);
        if (tableExists($db, 'announcement_comments')) $db->prepare("DELETE FROM announcement_comments WHERE announcement_id = ?")->execute([$id]);
        if (tableExists($db, 'announcement_likes')) $db->prepare("DELETE FROM announcement_likes WHERE announcement_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM announcements WHERE id = ?")->execute([$id]);
        $label = 'announcement';
        $snippet = mb_substr(trim((string) $row['title']), 0, 120);
        $context = $row['club_id'] ? 'in a club' : 'site-wide';
        break;

    case 'announcement_comment':
        $stmt = $db->prepare("SELECT user_id, announcement_id, content FROM announcement_comments WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Announcement comment not found'], 404);
        $owner = (int) $row['user_id'];
        $db->prepare("DELETE FROM announcement_comments WHERE id = ?")->execute([$id]);
        $label = 'announcement comment';
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $row['content'])), 0, 120);
        $context = 'on an announcement';
        break;
}

$details = 'Deleted ' . $label . ' #' . $id . ' ' . $context;
if ($snippet !== '') $details .= ': "' . $snippet . '"';
if ($reason !== '') $details .= ' — reason: ' . $reason;

logAdminAction('delete_' . $type, $type, $id, $details);

if ($owner > 0 && $owner !== (int) $adminId) {
    $notificationType = strpos($label, 'comment') !== false ? 'comment_deleted' : 'post_deleted';
    notifyUser($owner, $notificationType, 'Content removed by an administrator', $reason !== '' ? $reason : 'An administrator removed your ' . $label . '.', 'index.html', $adminId);
}

jsonResponse([
    'success' => true,
    'message' => ucfirst($label) . ' deleted',
    'type' => $type,
    'id' => $id,
]);
