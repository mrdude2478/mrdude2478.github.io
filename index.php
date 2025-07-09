<?php
$url = $_GET['url'] ?? '';

if (!$url || stripos($url, 'https://raw.githubusercontent.com') !== 0) {
    http_response_code(400);
    echo "Invalid or missing URL.";
    exit;
}

// Fetch headers from the URL
$headers = get_headers($url, true);
$status = $headers[0];

if (strpos($status, "200") === false) {
    http_response_code(404);
    echo "File not found or inaccessible.";
    exit;
}

// Handle HEAD requests
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    // Set Content-Type and Content-Length from upstream headers
    header("Content-Type: application/octet-stream");
    if (isset($headers['Content-Length'])) {
        header("Content-Length: " . $headers['Content-Length']);
    }
    exit;
}

// Handle GET requests
header("Content-Type: application/octet-stream");
if (isset($headers['Content-Length'])) {
    header("Content-Length: " . $headers['Content-Length']);
}
readfile($url);
?>