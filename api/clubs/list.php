<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$db = getDB();
$me = getCurrentUserId();
$clubs = $db->query("SELECT c.*, u.name AS owner_name FROM clubs c LEFT JOIN users u ON u.id = c.owner_id ORDER BY c.members_count DESC")->fetchAll();

$mem = $db->prepare("SELECT club_id, role FROM club_members WHERE user_id = ?");
$mem->execute([$me]);
$map = [];
foreach ($mem->fetchAll() as $row) $map[$row['club_id']] = $row['role'];

foreach ($clubs as &$c) {
    $tags = $db->prepare("SELECT tag FROM club_tags WHERE club_id = ?");
    $tags->execute([$c['id']]);
    $c['tags'] = array_column($tags->fetchAll(), 'tag');
    $acts = $db->prepare("SELECT activity FROM club_activities WHERE club_id = ?");
    $acts->execute([$c['id']]);
    $c['activities'] = array_column($acts->fetchAll(), 'activity');
    $c['membership'] = $map[$c['id']] ?? 'none';
    $c['is_manager'] = isClubManager($c['id']);
    $c['members'] = (int) $c['members_count'];
}
unset($c);

jsonResponse(['success' => true, 'clubs' => $clubs]);
