<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$commentId = (int)($data['comment_id'] ?? 0);
if (!$commentId) jsonResponse(['error' => 'Comment ID required'], 400);
$db = getDB();
$me = getCurrentUserId();
$stmt = $db->prepare('SELECT id, user_id, post_id, content FROM comments WHERE id = ?');
$stmt->execute([$commentId]);
$comment = $stmt->fetch();
if (!$comment) jsonResponse(['error' => 'Comment not found'], 404);

$isAdminAction = isAdmin() && (int)$comment['user_id'] !== (int)$me;
if ((int)$comment['user_id'] !== (int)$me && !$isAdminAction) jsonResponse(['error' => 'Not allowed'], 403);

deleteCommentTree($db, $commentId);

if ($isAdminAction) {
    $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $comment['content'])), 0, 120);
    logAdminAction('delete_comment', 'comment', $commentId, 'Removed comment on post #' . (int) $comment['post_id'] . ': "' . $snippet . '"');
    notifyUser((int) $comment['user_id'], 'comment_deleted', 'Comment removed by an administrator', 'An administrator removed one of your comments.', 'index.html', $me);
}

jsonResponse(['success' => true, 'message' => 'Comment deleted']);
