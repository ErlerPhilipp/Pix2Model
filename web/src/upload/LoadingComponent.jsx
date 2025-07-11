import './loadingOverlay.css'

import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

//class LoadingScreen extends Component {
function LoadingScreen(props) {
    //constructor(props) {
    //    super(props);
    //    this.state = {currentPipeState: props.currentPipeState, jobPosition: props.jobPosition, isLoading: props.isLoading, status: props.status};
    //}

    //render() {
    return (
        <div className="loading-state">
            <div className="loading-upload"></div>
            <div className="loading-text">Stage: {props.currentPipeState}<br></br>
                                        {props.status}: {props.jobPosition}</div>
        </div>
    )
    //}
}

export default withTranslation()(LoadingScreen);