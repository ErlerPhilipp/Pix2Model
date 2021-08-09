import 'react-dropzone-uploader/dist/styles.css'
import Dropzone from 'react-dropzone-uploader'

import './UploadComponent.css';

function Upload(props) {
  // specify upload params and url for your files
  const getUploadParams = ({ meta }) => { return { url: 'https://httpbin.org/post' } }
  
  // called every time a file's `status` changes
  const handleChangeStatus = ({ meta, remove }, status) => {
    if (status === 'headers_received') {
      console.log(meta)
      //document.querySelector("#description").innerHTML = `Upload successful!\nJob created with id:<br/><a href="/result?id=${response}">${response}</a>`;
      document.querySelector("#description").innerHTML = `Upload successful!\nJob created with id:<br/>`;
      //remove()
    } else if (status === 'aborted') {
      console.log(meta)
      document.querySelector("#description").innerHTML = `Upload failed`;
    }
  }

  
  // receives array of files that are done uploading when submit button is clicked
  const handleSubmit = (files, allFiles) => { 
    allFiles.forEach(f => f.remove());
  }

  const handleSuccess = (file, response) => {
  }

  return (
    <div class='upload'>
        <p class='description' id='description'>
        Upload between 10-50 images to create your mesh
        </p>
    <Dropzone
      getUploadParams={getUploadParams}
      inputContent='Drop files here to upload. Max 100 files, 10MB per file'
      onChangeStatus={handleChangeStatus}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      accept="image/*"
    />
    </div>
  )
}

export default Upload;