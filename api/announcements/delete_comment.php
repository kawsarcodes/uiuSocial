<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

$data = json_decode(file_get_contents('php://input'), true);
$commentId = (int) ($data['comment_id'] ?? 0);
if (!$commentId) jsonResponse(['error' => 'Comment ID required'], 400);

$db = getDB();
$me = getCurrentUserId();

$stmt = $db->prepare("SELECT ac.id, ac.user_id, ac.announcement_id, ac.content, a.created_by, a.club_id
                      FROM announcement_comments ac
                      JOIN announcements a ON a.id = ac.announcement_id
                      WHERE ac.id = ?");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();
if (!$comment) jsonResponse(['error' => 'Comment not found'], 404);

$isAdminAction = (isAdmin() || isFaculty()) && (int) $comment['user_id'] !== (int) $me;
$allowed = (int) $comment['user_id'] === (int) $me
    || isAdmin()
    || isFaculty()
    || ($comment['club_id'] ? isClubManager($comment['club_id']) : false);
if (!$allowed) jsonResponse(['error' => 'Not allowed'], 403);

$db->prepare("DELETE FROM announcement_comments WHERE id = ?")->execute([$commentId]);

if ($isAdminAction) {
    $snippet = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $comment['content'])), 0, 120);
    logAdminAction('delete_announcement_comment', 'announcement_comment', $commentId, 'Removed a comment on announcement #' . (int) $comment['announcement_id'] . ': "' . $snippet . '"');
    notifyUser((int) $comment['user_id'], 'comment_deleted', 'Comment removed by an administrator', 'An administrator removed one of your comments.', 'index.html', $me);
}

jsonResponse(['success' => true, 'message' => 'Comment deleted']);
