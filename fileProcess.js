// document.getElementById('uploadForm').addEventListener('submit', function(event) {
//     event.preventDefault(); // Prevent the default form submission

//     const formData = new FormData();
//     const fileInput = document.getElementById('fileInput');
//     formData.append('file', fileInput.files[0]);

//     fetch('upload.php', {
//         method: 'POST',
//         body: formData
//     })
//     .then(response => response.text())
//     .then(data => {
       
//         document.getElementById('response').innerHTML = data; // Display server response
//     })
//     .catch(error => console.error('Error:', error));
// });



// const form = document.getElementById('uploadForm');
// form.addEventListener('submit', async (event) => {
//     event.preventDefault(); // Prevent the default form submission

//     const files = document.getElementById('fileInput').files;
//     const formData = new FormData();

//     for (const file of files) {
//         formData.append('files[]', file); // Append each file to FormData
//     }

//     try {
//         const response = await fetch('https://your-server-endpoint/upload', {
//             method: 'POST',
//             body: formData,
//         });

//         if (response.ok) {
//             const result = await response.json();
//             console.log('Upload successful:', result);
//         } else {
//             console.error('Upload failed:', response.statusText);
//         }
//     } catch (error) {
//         console.error('Error during upload:', error);
//     }
// });



const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');

form.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission
    const files = fileInput.files; // Get selected files
    handleFiles(files); // Call function to handle files
});

function handleFiles(files) {
    for (const file of files) {
        console.log(`File name: ${file.name}, Size: ${file.size} bytes`);
        // Additional processing can be done here
    }
}

