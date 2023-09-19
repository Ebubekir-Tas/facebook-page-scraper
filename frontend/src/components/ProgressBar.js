import React from 'react';

export const ProgressBar = ({ progress, total }) => {
  const percentComplete = Math.floor((progress / total) * 100);

  const progressStyle = {
    width: `${percentComplete}%`,
    height: '25px',
    backgroundColor: '#4CAF50',
    borderRadius: '5px',
    transition: 'width 0.2s ease-in-out',
  };

  const containerStyle = {
    width: '50%',
    height: '25px',
    backgroundColor: '#f1f1f1',
    borderRadius: '5px',
    marginLeft: 'auto',
    marginRight: 'auto',
    margin: '16px auto 16px auto',
    position: 'relative',
  };

  const textStyles = {
    margin: 0,
    fontSize: '14px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  }

  return (
    <div style={containerStyle}>
      <div style={progressStyle} />
      <p style={textStyles}>
        {percentComplete}% complete
      </p>
    </div>
  );
};
