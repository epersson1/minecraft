<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     exit; // Handle preflight requests
// }

$targetUrl = $_POST['url']; // URL to upload the file
$file = $_FILES['file']; // File to upload

if (isset($file) && isset($targetUrl)) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, array('file' => new CURLFile($file['tmp_name'], $file['type'], $file['name'])));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    echo $response; // Return the response from the target server
} else {
    echo json_encode(['error' => 'No file or URL provided']);
}
?>
