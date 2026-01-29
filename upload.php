<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $targetDir = "tempFiles/"; // Directory to save uploaded files
    $targetFile = $targetDir . basename($_FILES["file"]["name"]);

    // Check if the upload is successful
    if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetFile)) {
        echo "The file ". htmlspecialchars(basename($_FILES["file"]["name"])). " has been uploaded.";
    } else {
        echo "Sorry, there was an error uploading your file.";
    }
}
?>
