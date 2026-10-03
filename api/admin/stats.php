<?php
require_once __DIR__ . '/../../config/helpers.php';
requireAdmin();
header('Content-Type: application/json');
$db = getDB();
$stats = [
    'total_users' => (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'approved_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE status = 'approved'")->fetchColumn(),
    'pending_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE status = 'pending'")->fetchColumn(),
    'rejected_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE status = 'rejected'")->fetchColumn(),
    'banned_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE is_banned = 1")->fetchColumn(),
    'online_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE is_online = 1")->fetchColumn(),
    'faculty_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'faculty'")->fetchColumn(),
    'guest_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'guest'")->fetchColumn(),
    'new_users_24h' => (int) $db->query("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)")->fetchColumn(),
    'new_users_7d' => (int) $db->query("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn(),
    'total_posts' => (int) $db->query("SELECT COUNT(*) FROM posts")->fetchColumn(),
    'total_groups' => (int) $db->query("SELECT COUNT(*) FROM groups_table")->fetchColumn(),
    'total_clubs' => (int) $db->query("SELECT COUNT(*) FROM clubs")->fetchColumn(),
    'total_events' => (int) $db->query("SELECT COUNT(*) FROM events")->fetchColumn(),
    'total_messages' => (int) $db->query("SELECT COUNT(*) FROM messages")->fetchColumn(),
    'pending_reports' => (int) $db->query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")->fetchColumn(),
    'resolved_reports' => (int) $db->query("SELECT COUNT(*) FROM reports WHERE status = 'reviewed'")->fetchColumn(),
    'dismissed_reports' => (int) $db->query("SELECT COUNT(*) FROM reports WHERE status = 'dismissed'")->fetchColumn(),
    'pending_verifications' => (int) $db->query("SELECT COUNT(*) FROM verification_queue WHERE status = 'pending'")->fetchColumn(),
];

$stats['mean_response_minutes'] = 0;
try {
    $stmt = $db->query("
        SELECT TIMESTAMPDIFF(MINUTE, r.created_at, a.created_at) AS mins
        FROM reports r
        JOIN admin_logs a ON a.target_type = 'post' AND a.target_id = r.post_id
        WHERE a.action = 'resolve_report'
        LIMIT 200
    ");
    $mins = array_filter(array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)));
    if ($mins) $stats['mean_response_minutes'] = (int) round(array_sum($mins) / count($mins));
} catch (Exception $e) {
    $stats['mean_response_minutes'] = 0;
}

$stats['report_breakdown'] = [];
foreach ($db->query("SELECT reason, COUNT(*) c FROM reports WHERE status = 'pending' GROUP BY reason")->fetchAll() as $row) {
    $stats['report_breakdown'][$row['reason']] = (int) $row['c'];
}

$stats['by_department'] = $db->query("
    SELECT department, COUNT(*) AS total,
           SUM(status = 'approved') AS approved,
           SUM(is_banned = 1) AS banned
    FROM users
    GROUP BY department
    ORDER BY total DESC
")->fetchAll();

$stats['growth'] = array_map(fn($r) => [
    'day' => $r['day'],
    'count' => (int) $r['count'],
], $db->query("
    SELECT DATE_FORMAT(created_at, '%b %d') AS day, COUNT(*) AS count
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
")->fetchAll());

jsonResponse(['success' => true, 'stats' => $stats]);
