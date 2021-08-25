import React, {Suspense} from 'react'
import ReactDOM from 'react-dom';

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
