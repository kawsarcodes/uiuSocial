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
$stmt = $db->prepare('SELECT id, user_id FROM comments WHERE id = ?');
$stmt->execute([$commentId]);
$comment = $stmt->fetch();
if (!$comment) jsonResponse(['error' => 'Comment not found'], 404);
if ((int)$comment['user_id'] !== (int)$me && !isAdmin()) jsonResponse(['error' => 'Not allowed'], 403);
$content = trim($data['content'] ?? '');
if ($content === '') jsonResponse(['error' => 'Content required'], 400);
$db->prepare('UPDATE comments SET content = ?, edited_at = NOW() WHERE id = ?')->execute([$content, $commentId]);
jsonResponse(['success' => true, 'message' => 'Comment updated']);
