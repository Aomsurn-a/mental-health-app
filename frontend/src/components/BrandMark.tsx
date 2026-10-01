import React from 'react';
import mindeaseCloud from '../assets/mindease-cloud.png';

type BrandMarkProps = {
  className?: string;
};

const BrandMark: React.FC<BrandMarkProps> = ({ className = '' }) => (
  <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
    <img src={mindeaseCloud} alt="" />
  </span>
);

export default BrandMark;
