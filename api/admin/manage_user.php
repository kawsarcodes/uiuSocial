<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$db = getDB();
$me = getCurrentUserId();

$ids = $data['user_ids'] ?? [];
if (!is_array($ids)) $ids = [$ids];
$ids = array_values(array_filter(array_map('intval', $ids)));
if (empty($ids)) jsonResponse(['error' => 'No users selected'], 400);

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $db->prepare("SELECT id, name, role, status, is_banned FROM users WHERE id IN ($placeholders)");
$stmt->execute($ids);
$targets = $stmt->fetchAll();
if (!$targets) jsonResponse(['error' => 'No matching users found'], 404);

$role = $data['role'] ?? null;
$status = $data['status'] ?? null;
$reason = trim($data['reason'] ?? '');
$until = trim($data['until'] ?? '') ?: null;
$until = $until ? $until . ' 23:59:59' : null;

if ($role !== null && !in_array($role, ['student', 'faculty', 'guest', 'admin'], true)) {
    jsonResponse(['error' => 'Invalid role'], 400);
}
if ($status !== null && !in_array($status, ['pending', 'approved', 'rejected'], true)) {
    jsonResponse(['error' => 'Invalid status'], 400);
}
if ($action === 'ban' && $reason === '') jsonResponse(['error' => 'A ban reason is required'], 400);

$changed = [];
$failed = [];

foreach ($targets as $user) {
    $id = (int) $user['id'];

    if ($id === (int) $me && $action === 'ban') {
        $failed[] = $user['name'] . ' (cannot ban your own account)';
        continue;
    }
    if ($id === (int) $me && $action === 'set_role' && $role !== 'admin') {
        $failed[] = $user['name'] . ' (cannot change your own role)';
        continue;
    }
    if ($id === (int) $me && $action === 'set_status' && $status !== 'approved') {
        $failed[] = $user['name'] . ' (cannot change your own status)';
        continue;
    }

    if ($action === 'ban' && (int) $user['is_banned'] === 1) {
        $failed[] = $user['name'] . ' (already banned)';
        continue;
    }

    if ($action === 'ban') {
        $db->prepare("UPDATE users SET is_banned = 1, banned_reason = ?, banned_until = ? WHERE id = ?")->execute([$reason, $until, $id]);
        logAdminAction('ban', 'user', $id, $reason);
        notifyUser($id, 'join_rejected', 'Account suspended', 'Your account was suspended by an administrator. Reason: ' . $reason, 'login.html');
    } elseif ($action === 'unban') {
        $db->prepare("UPDATE users SET is_banned = 0, banned_reason = NULL, banned_until = NULL WHERE id = ?")->execute([$id]);
        logAdminAction('unban', 'user', $id, 'Unbanned');
        notifyUser($id, 'join_approved', 'Account restored', 'Your account suspension was lifted by an administrator.', 'index.html');
    } elseif ($action === 'set_role' && $role !== null) {
        $db->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$role, $id]);
        logAdminAction('set_role', 'user', $id, ucfirst($role) . ' ' . $user['name']);
        notifyUser($id, 'join_approved', 'Account role updated', 'An administrator changed your role to ' . strtoupper($role) . '.', 'index.html');
    } elseif ($action === 'set_status' && $status !== null) {
        $db->prepare("UPDATE users SET status = ? WHERE id = ?")->execute([$status, $id]);
        logAdminAction('set_status', 'user', $id, ucfirst($status) . ' ' . $user['name']);
        $type = $status === 'approved' ? 'join_approved' : ($status === 'rejected' ? 'join_rejected' : 'join_request');
        notifyUser($id, $type, 'Account status updated', 'An administrator set your account status to ' . strtoupper($status) . '.', 'index.html');
    } else {
        $failed[] = $user['name'] . ' (unsupported action)';
        continue;
    }

    $changed[] = $user['name'];
}

jsonResponse([
    'success' => true,
    'changed' => $changed,
    'failed' => $failed,
    'message' => count($changed) . ' user(s) updated',
]);
