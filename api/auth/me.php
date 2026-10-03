<?php
require_once __DIR__ . '/../../config/helpers.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    jsonResponse(['authenticated' => false, 'user' => null]);
}

$user = getCurrentUser();
if (!$user) {
    session_destroy();
    jsonResponse(['authenticated' => false, 'user' => null]);
}

$user['can_act'] = canAct($user);
$user['is_admin'] = isAdmin($user);
$user['is_faculty'] = isFaculty($user);
$user['is_guest'] = isGuestUser($user);
$user['is_pending'] = ($user['status'] ?? 'approved') === 'pending';

jsonResponse([
    'authenticated' => true,
    'user' => $user
]);
