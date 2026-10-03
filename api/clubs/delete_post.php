<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

$data = json_decode(file_get_contents('php://input'), true);
$postId = (int) ($data['post_id'] ?? 0);
if (!$postId) jsonResponse(['error' => 'Post ID required'], 400);

$db = getDB();
if (!tableExists($db, 'club_posts')) jsonResponse(['error' => 'Club posts are not available'], 404);

$me = getCurrentUserId();
$stmt = $db->prepare("SELECT id, club_id, user_id, content FROM club_posts WHERE id = ?");
$stmt->execute([$postId]);
$post = $stmt->fetch();
if (!$post) jsonResponse(['error' => 'Club post not found'], 404);

$isAdminAction = isAdmin() && (int) $post['user_id'] !== (int) $me;
$allowed = (int) $post['user_id'] === (int) $me || isAdmin() || isClubManager($post['club_id']);
if (!$allowed) jsonResponse(['error' => 'Not allowed'], 403);

if (tableExists($db, 'club_post_comments')) $db->prepare("DELETE FROM club_post_comments WHERE post_id = ?")->execute([$postId]);
if (tableExists($db, 'club_post_likes')) $db->prepare("DELETE FROM club_post_likes WHERE post_id = ?")->execute([$postId]);
$db->prepare("DELETE FROM club_posts WHERE id = ?")->execute([$postId]);

if ($isAdminAction) {
    logAdminAction('delete_club_post', 'club_post', $postId, 'Removed a club post in club #' . (int) $post['club_id']);
    notifyUser((int) $post['user_id'], 'post_deleted', 'Post removed by an administrator', 'An administrator removed one of your club posts.', 'index.html', $me);
}

jsonResponse(['success' => true, 'message' => 'Club post deleted']);
