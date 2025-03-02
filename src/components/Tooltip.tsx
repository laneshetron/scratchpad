import React from 'react';
import { TooltipProps } from '../types';
import './Tooltip.css';

const Tooltip: React.FC<TooltipProps> = ({ x, y, visible, content }) => {
  if (!visible) return null;

  return (
    <div
      className="tooltip"
      style={{ left: `${x}px`, top: `${y}px` }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default Tooltip;
