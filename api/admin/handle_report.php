<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$id = (int) ($data['id'] ?? 0);
$action = $data['action'] ?? 'dismiss';

$db = getDB();
$stmt = $db->prepare("SELECT r.*, p.user_id AS post_owner FROM reports r JOIN posts p ON p.id = r.post_id WHERE r.id = ?");
$stmt->execute([$id]);
$report = $stmt->fetch();
if (!$report) jsonResponse(['error' => 'Report not found'], 404);

if ($action === 'delete') {
    $db->prepare("DELETE FROM posts WHERE id = ?")->execute([$report['post_id']]);
    $db->prepare("UPDATE reports SET status = 'reviewed' WHERE post_id = ?")->execute([$report['post_id']]);
    notifyActivity('post_deleted', getCurrentUserId(), [$report['post_owner']], ['post_id' => (int) $report['post_id']]);
    notifyActivity('report_resolved', 0, [$report['reported_by']]);
    logAdminAction('resolve_report', 'post', (int) $report['post_id'], 'Deleted reported post (' . $report['reason'] . ')');
    jsonResponse(['success' => true, 'status' => 'deleted']);
}

$db->prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?")->execute([$id]);
notifyActivity('report_resolved', 0, [$report['reported_by']]);
logAdminAction('resolve_report', 'post', (int) $report['post_id'], 'Dismissed report (' . $report['reason'] . ')');
jsonResponse(['success' => true, 'status' => 'dismissed']);
