<?php
require_once __DIR__ . '/../../config/helpers.php';
requireLogin();
header('Content-Type: application/json');

$q = trim($_GET['q'] ?? '');
$type = strtolower(trim($_GET['type'] ?? 'all'));
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 8;
$offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

$all = ['people', 'posts', 'groups', 'clubs', 'events'];
$types = ($type === '' || $type === 'all') ? $all : (in_array($type, $all, true) ? [$type] : $all);

if (mb_strlen($q) < 2) {
    jsonResponse(['success' => true, 'query' => $q, 'results' => array_fill_keys($all, []), 'counts' => array_fill_keys($all, 0), 'total' => 0]);
}

$db = getDB();
$like = "%$q%";
$results = array_fill_keys($all, []);
$counts = array_fill_keys($all, 0);

$shape = function (array $row, $type, $title, $subtitle, $image, $link, $meta = '') {
    return [
        'id' => (int) $row['id'],
        'type' => $type,
        'title' => $title,
        'subtitle' => $subtitle,
        'image' => $image,
        'link' => $link,
        'meta' => $meta,
        'time' => isset($row['created_at']) ? timeAgo($row['created_at']) : '',
    ];
};

if (in_array('people', $types, true)) {
    $stmt = $db->prepare("SELECT u.id, u.name, u.department, u.role, u.avatar, u.about,
                                 (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers
                          FROM users u
                          WHERE u.status = 'approved' AND u.role != 'guest'
                            AND (u.name LIKE ? OR u.department LIKE ? OR u.email LIKE ?)
                          ORDER BY (u.name LIKE ?) DESC, u.name ASC
                          LIMIT $limit OFFSET $offset");
    $stmt->execute([$like, $like, $like, "$q%"]);
    foreach ($stmt->fetchAll() as $r) {
        $results['people'][] = $shape($r, 'people', $r['name'], trim(ucfirst($r['role']) . ' · ' . ($r['department'] ?: 'UIU')), $r['avatar'], 'profile.html?id=' . $r['id'], $r['followers'] . ' followers');
    }
    $c = $db->prepare("SELECT COUNT(*) c FROM users WHERE status = 'approved' AND role != 'guest' AND (name LIKE ? OR department LIKE ? OR email LIKE ?)");
    $c->execute([$like, $like, $like]);
    $counts['people'] = (int) $c->fetch()['c'];
}

if (in_array('posts', $types, true)) {
    $stmt = $db->prepare("SELECT p.id, p.content, p.image, p.created_at, p.group_id,
                                 u.name AS author, u.avatar, g.name AS group_name
                          FROM posts p
                          JOIN users u ON u.id = p.user_id
                          LEFT JOIN groups_table g ON g.id = p.group_id
                          WHERE p.content LIKE ?
                          ORDER BY p.created_at DESC
                          LIMIT $limit OFFSET $offset");
    $stmt->execute([$like]);
    foreach ($stmt->fetchAll() as $r) {
        $link = $r['group_id']
            ? 'group_detail.html?id=' . $r['group_id'] . '#post-' . $r['id']
            : 'index.html#post-' . $r['id'];
        $where = $r['group_name'] ? 'in ' . $r['group_name'] : 'on the feed';
        $results['posts'][] = $shape($r, 'posts', notificationSnippet($r['content'], 90), $r['author'] . ' · ' . $where, $r['avatar'], $link, timeAgo($r['created_at']));
    }
    $c = $db->prepare("SELECT COUNT(*) c FROM posts WHERE content LIKE ?");
    $c->execute([$like]);
    $counts['posts'] = (int) $c->fetch()['c'];
}

if (in_array('groups', $types, true)) {
    $stmt = $db->prepare("SELECT id, name, description, category, image, members_count, created_at
                          FROM groups_table
                          WHERE name LIKE ? OR description LIKE ?
                          ORDER BY (name LIKE ?) DESC, name ASC
                          LIMIT $limit OFFSET $offset");
    $stmt->execute([$like, $like, "$q%"]);
    foreach ($stmt->fetchAll() as $r) {
        $results['groups'][] = $shape($r, 'groups', $r['name'], trim(($r['category'] ?: 'Group') . ' · ' . ($r['members_count'] ?: 0) . ' members'), $r['image'], 'group_detail.html?id=' . $r['id'], notificationSnippet($r['description'] ?: '', 60));
    }
    $c = $db->prepare("SELECT COUNT(*) c FROM groups_table WHERE name LIKE ? OR description LIKE ?");
    $c->execute([$like, $like]);
    $counts['groups'] = (int) $c->fetch()['c'];
}

if (in_array('clubs', $types, true)) {
    $stmt = $db->prepare("SELECT id, name, category, image, icon, icon_color, icon_bg, members_count, about, created_at
                          FROM clubs
                          WHERE name LIKE ? OR about LIKE ? OR category LIKE ?
                          ORDER BY (name LIKE ?) DESC, name ASC
                          LIMIT $limit OFFSET $offset");
    $stmt->execute([$like, $like, $like, "$q%"]);
    foreach ($stmt->fetchAll() as $r) {
        $results['clubs'][] = $shape($r, 'clubs', $r['name'], trim(($r['category'] ?: 'Club') . ' · ' . ($r['members_count'] ?: 0) . ' members'), $r['image'], 'club_detail.html?id=' . $r['id'], notificationSnippet($r['about'] ?: '', 60), $r['icon'], $r['icon_color'], $r['icon_bg']);
    }
    $c = $db->prepare("SELECT COUNT(*) c FROM clubs WHERE name LIKE ? OR about LIKE ? OR category LIKE ?");
    $c->execute([$like, $like, $like]);
    $counts['clubs'] = (int) $c->fetch()['c'];
}

if (in_array('events', $types, true)) {
    $stmt = $db->prepare("SELECT id, title, description, category, event_date, event_time, location, image, organizer, created_at
                          FROM events
                          WHERE title LIKE ? OR description LIKE ? OR location LIKE ? OR organizer LIKE ?
                          ORDER BY (title LIKE ?) DESC, event_date ASC
                          LIMIT $limit OFFSET $offset");
    $stmt->execute([$like, $like, $like, $like, "$q%"]);
    foreach ($stmt->fetchAll() as $r) {
        $when = trim(($r['event_date'] ?: '') . ' ' . ($r['event_time'] ? substr($r['event_time'], 0, 5) : ''));
        $results['events'][] = $shape($r, 'events', $r['title'], trim(($r['location'] ?: 'UIU') . ($r['organizer'] ? ' · ' . $r['organizer'] : '')), $r['image'], 'event_detail.html?id=' . $r['id'], $when);
    }
    $c = $db->prepare("SELECT COUNT(*) c FROM events WHERE title LIKE ? OR description LIKE ? OR location LIKE ? OR organizer LIKE ?");
    $c->execute([$like, $like, $like, $like]);
    $counts['events'] = (int) $c->fetch()['c'];
}

$total = 0;
foreach ($counts as $n) $total += $n;

jsonResponse([
    'success' => true,
    'query' => $q,
    'results' => $results,
    'counts' => $counts,
    'total' => $total,
]);
