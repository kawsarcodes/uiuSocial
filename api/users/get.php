<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$id = (int) ($_GET['id'] ?? 0);
if (!$id) jsonResponse(['error' => 'User id required'], 400);

$db = getDB();
$stmt = $db->prepare("SELECT id, name, email, student_id, department, role, avatar, cover_photo, about, is_online, status, created_at FROM users WHERE id = ?");
$stmt->execute([$id]);
$user = $stmt->fetch();
if (!$user) jsonResponse(['error' => 'User not found'], 404);

$me = getCurrentUserId();
$groups = $db->prepare("SELECT g.id, g.name, g.image, g.category FROM group_members gm JOIN groups_table g ON g.id = gm.group_id WHERE gm.user_id = ? AND gm.role != 'requested'");
$groups->execute([$id]);
$clubs = $db->prepare("SELECT c.id, c.name, c.image, c.slug FROM club_members cm JOIN clubs c ON c.id = cm.club_id WHERE cm.user_id = ? AND cm.role != 'requested'");
$clubs->execute([$id]);
$conn = $db->prepare("
    SELECT u.id, u.name, u.avatar, u.role, u.department
    FROM connections c
    JOIN users u ON u.id = IF(c.user_id = ?, c.connected_user_id, c.user_id)
    WHERE (c.user_id = ? OR c.connected_user_id = ?) AND c.status = 'accepted' AND u.id != ?
");
$conn->execute([$id, $id, $id, $id]);

jsonResponse([
    'success' => true,
    'user' => $user,
    'groups' => $groups->fetchAll(),
    'clubs' => $clubs->fetchAll(),
    'connections' => $conn->fetchAll(),
    'is_self' => (int) $id === (int) $me
]);
