import 'react-dropzone-uploader/dist/styles.css'
import Dropzone from 'react-dropzone-uploader'

import './UploadPLYComponent.css';

function UploadPLY(props) {
  // specify upload params and url for your files
  const getUploadParams = ({ meta }) => { return { url: 'https://httpbin.org/post' } }
  
  // called every time a file's `status` changes
  const handleChangeStatus = ({ meta, file }, status) => { console.log(status, meta, file) }
  
  // receives array of files that are done uploading when submit button is clicked
  const handleSubmit = (files) => { console.log(files.map(f => f.meta)) }

  return (
    <div class='upload'>
        <p class='description'>
        Upload a ply file to recreate the 3D model
        </p>
    <Dropzone
      getUploadParams={getUploadParams}
      onChangeStatus={handleChangeStatus}
      onSubmit={handleSubmit}
      accept="image/*,audio/*,video/*"
    />
    <form>
      <label for="fname">First name:</label>
      <input type="text" id="fname" name="fname"/>
    </form>
    </div>
  )
}

export default UploadPLY;