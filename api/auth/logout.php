<?php
require_once __DIR__ . '/../../config/session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Destroy session
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}
// Unset session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

jsonResponse(['success' => true, 'message' => 'Logged out successfully']);
