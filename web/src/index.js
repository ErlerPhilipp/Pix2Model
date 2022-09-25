import React, {Suspense} from 'react'
import ReactDOM from 'react-dom';

import './fonts/Roboto-Regular.ttf';
import './fonts/Roboto-Bold.ttf';
import './fonts/Roboto-Italic.ttf';

import './fonts/Roboto-Regular.eot';
import './fonts/Roboto-Bold.eot';
import './fonts/Roboto-Italic.eot';

import './index.css';
import './react-tabs-custom.css';
import './i18n';

import CustomTabs from "./CustomTabComponent";

ReactDOM.render(
  <Suspense fallback={(<div>Loading...</div>)}>
    <CustomTabs></CustomTabs>
  </Suspense>,
  document.getElementById('root')
);
