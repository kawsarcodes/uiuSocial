<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$postId = (int) ($data['post_id'] ?? 0);
$commentId = isset($data['comment_id']) ? (int) $data['comment_id'] : 0;
$user = getCurrentUser();
$db = getDB();

$stmt = $db->prepare("SELECT id, user_id, group_id FROM posts WHERE id = ?");
$stmt->execute([$postId]);
$post = $stmt->fetch();
if (!$post) jsonResponse(['error' => 'Post not found'], 404);

$can = isAdmin($user) || (int) $post['user_id'] === (int) $user['id'];
if ($post['group_id'] && isGroupManager($post['group_id'], $user)) {
    $can = true;
}
if (!$can) jsonResponse(['error' => 'Not allowed'], 403);

if ($commentId) {
    $cStmt = $db->prepare('SELECT id, user_id, content FROM comments WHERE id = ? AND post_id = ?');
    $cStmt->execute([$commentId, $postId]);
    $comment = $cStmt->fetch();
    if (!$comment) jsonResponse(['error' => 'Comment not found'], 404);
    if ((int) $comment['user_id'] !== (int) $user['id'] && !isAdmin($user)) {
        jsonResponse(['error' => 'Not allowed'], 403);
    }
    $cIsAdminAction = isAdmin($user) && (int) $comment['user_id'] !== (int) $user['id'];
    deleteCommentTree($db, $commentId);
    if ($cIsAdminAction) {
        $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $comment['content'])), 0, 120);
        logAdminAction('delete_comment', 'comment', $commentId, 'Removed comment on post #' . $postId . ': "' . $snippet . '"');
        notifyUser((int) $comment['user_id'], 'comment_deleted', 'Comment removed by an administrator', 'An administrator removed one of your comments.', 'index.html', $user['id']);
    }
    jsonResponse(['success' => true, 'message' => 'Comment deleted']);
}

$isAdminAction = isAdmin($user) && (int) $post['user_id'] !== (int) $user['id'];
if (tableExists($db, 'comments')) deleteCommentsForPost($db, $postId);
if (tableExists($db, 'post_likes')) $db->prepare("DELETE FROM post_likes WHERE post_id = ?")->execute([$postId]);
if (tableExists($db, 'post_saves')) $db->prepare("DELETE FROM post_saves WHERE post_id = ?")->execute([$postId]);
if (tableExists($db, 'reports')) $db->prepare("DELETE FROM reports WHERE post_id = ?")->execute([$postId]);
$db->prepare("DELETE FROM posts WHERE id = ?")->execute([$postId]);

if ($isAdminAction) {
    $context = $post['group_id'] ? 'in a department group' : 'on the main feed';
    logAdminAction('delete_post', 'post', $postId, 'Removed a post ' . $context);
    notifyUser((int) $post['user_id'], 'post_deleted', 'Post removed by an administrator', 'An administrator removed one of your posts.', 'index.html', $user['id']);
}

jsonResponse(['success' => true, 'message' => 'Post deleted']);
