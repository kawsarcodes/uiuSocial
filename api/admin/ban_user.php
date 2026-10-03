<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
$data = json_decode(file_get_contents('php://input'), true);
$userId = (int)($data['user_id'] ?? 0);
$action = $data['action'] ?? 'ban';
$reason = trim($data['reason'] ?? '');
$until = $data['until'] ?? null;
$me = getCurrentUserId();
if (!$userId) jsonResponse(['error' => 'User ID required'], 400);
if ($userId === (int) $me) jsonResponse(['error' => 'You cannot moderate your own account'], 400);
$db = getDB();
$stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$userId]);
if (!$stmt->fetch()) jsonResponse(['error' => 'User not found'], 404);
if ($action === 'ban') {
    $db->prepare("UPDATE users SET is_banned = 1, banned_reason = ?, banned_until = ? WHERE id = ?")->execute([$reason ?: 'No reason given', $until, $userId]);
    logAdminAction('ban', 'user', $userId, $reason ?: 'No reason given');
    notifyUser($userId, 'join_rejected', 'Account suspended', 'Your account was suspended by an administrator.', 'login.html');
    jsonResponse(['success' => true, 'message' => 'User banned']);
} elseif ($action === 'unban') {
    $db->prepare("UPDATE users SET is_banned = 0, banned_reason = NULL, banned_until = NULL WHERE id = ?")->execute([$userId]);
    logAdminAction('unban', 'user', $userId, 'Unbanned');
    notifyUser($userId, 'join_approved', 'Account restored', 'Your account suspension was lifted by an administrator.', 'index.html');
    jsonResponse(['success' => true, 'message' => 'User unbanned']);
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
