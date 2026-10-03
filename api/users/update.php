<?php
require_once __DIR__ . '/../../config/helpers.php';
requireCanAct();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$db = getDB();
$me = getCurrentUserId();
$name = trim($_POST['name'] ?? '');
$about = trim($_POST['about'] ?? '');

$fields = [];
$params = [];
if ($name !== '') {
    $fields[] = 'name = ?';
    $params[] = $name;
}
if (isset($_POST['about'])) {
    $fields[] = 'about = ?';
    $params[] = $about;
}

$avatar = uploadImage('avatar', 'avatars');
if (!$avatar && !empty($_POST['avatar_url'])) {
    $avatar = trim($_POST['avatar_url']);
}
if ($avatar) {
    $fields[] = 'avatar = ?';
    $params[] = $avatar;
}

$cover = uploadImage('cover_photo', 'covers');
if (!$cover && !empty($_POST['cover_url'])) {
    $cover = trim($_POST['cover_url']);
}
if ($cover) {
    $fields[] = 'cover_photo = ?';
    $params[] = $cover;
}

if (!$fields) {
    jsonResponse(['error' => 'Nothing to update'], 400);
}
$params[] = $me;
$db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);

jsonResponse(['success' => true, 'user' => getCurrentUser()]);
