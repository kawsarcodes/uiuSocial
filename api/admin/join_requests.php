<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$db = getDB();

$status = in_array($_GET['status'] ?? '', ['pending', 'approved', 'rejected'], true) ? $_GET['status'] : 'pending';
$search = trim($_GET['q'] ?? '');
$requestedRole = trim($_GET['requested_role'] ?? '');

$where = ['v.status = ?'];
$params = [$status];

if ($search !== '') {
    $where[] = '(u.name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
    $like = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if ($requestedRole !== '') {
    $where[] = 'v.requested_role = ?';
    $params[] = $requestedRole;
}

$stmt = $db->prepare("
    SELECT v.id, v.requested_role, v.status, v.created_at,
           u.id AS user_id, u.name, u.email, u.avatar, u.department, u.student_id, u.role, u.is_banned
    FROM verification_queue v
    JOIN users u ON u.id = v.user_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY v.created_at DESC
");
$stmt->execute($params);
$requests = $stmt->fetchAll();

jsonResponse(['success' => true, 'requests' => $requests, 'status' => $status]);
