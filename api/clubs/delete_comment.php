<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

$data = json_decode(file_get_contents('php://input'), true);
$commentId = (int) ($data['comment_id'] ?? 0);
if (!$commentId) jsonResponse(['error' => 'Comment ID required'], 400);

$db = getDB();
if (!tableExists($db, 'club_post_comments')) jsonResponse(['error' => 'Club comments are not available'], 404);

$me = getCurrentUserId();
$stmt = $db->prepare("SELECT c.id, c.user_id, c.post_id, p.club_id, c.content
                      FROM club_post_comments c
                      JOIN club_posts p ON p.id = c.post_id
                      WHERE c.id = ?");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();
if (!$comment) jsonResponse(['error' => 'Club comment not found'], 404);

$isAdminAction = isAdmin() && (int) $comment['user_id'] !== (int) $me;
$allowed = (int) $comment['user_id'] === (int) $me || isAdmin() || isClubManager($comment['club_id']);
if (!$allowed) jsonResponse(['error' => 'Not allowed'], 403);

$db->prepare("DELETE FROM club_post_comments WHERE id = ?")->execute([$commentId]);

if ($isAdminAction) {
    $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $comment['content'])), 0, 120);
    logAdminAction('delete_club_comment', 'club_comment', $commentId, 'Removed a comment on club post #' . (int) $comment['post_id'] . ': "' . $snippet . '"');
    notifyUser((int) $comment['user_id'], 'comment_deleted', 'Comment removed by an administrator', 'An administrator removed one of your club comments.', 'index.html', $me);
}

jsonResponse(['success' => true, 'message' => 'Club comment deleted']);
