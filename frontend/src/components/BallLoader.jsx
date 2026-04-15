import React from 'react';
import styled from 'styled-components';

const BallLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <span style={{ '--delay': 1 }} className="ball" />
        <span style={{ '--delay': 2 }} className="ball" />
        <span style={{ '--delay': 3 }} className="ball" />
        <span style={{ '--delay': 4 }} className="ball" />
        <span style={{ '--delay': 5 }} className="ball" />
        <span style={{ '--delay': 6 }} className="ball" />
        <span style={{ '--delay': 7 }} className="ball" />
        <span style={{ '--delay': 8 }} className="ball" />
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;

  .loader {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    position: relative;
    border: solid 5px transparent;
    box-shadow: 5px 5px 5px rgb(12, 12, 12), inset 5px 5px 5px rgb(24, 23, 23),
      inset -1px -1px 10px rgba(153, 148, 148, 0.432),
      -1px -1px 10px rgba(206, 198, 198, 0.281);
  }

  .loader::before {
    content: "";
    display: inline-block;
    position: absolute;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 5px 5px 20px black, -2px -2px 40px black;
    background: repeating-conic-gradient(
      rgb(61, 59, 59) 0%,
      rgba(248, 248, 246, 0.534) 15%,
      rgb(54, 52, 52) 33.33%
    );
  }

  .ball {
    width: 15px;
    height: 15px;
    display: inline-block;
    background: radial-gradient(
      circle at 5px 5px,
      rgb(255, 255, 255) 1%,
      rgb(5, 5, 5) 50%
    );
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) translateX(97.5px);
    animation: rotate 5s calc(var(--delay) * 0.2s) infinite linear;
  }

  @keyframes rotate {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) translateX(97.5px);
    }

    100% {
      transform: translate(-50%, -50%) rotate(360deg) translateX(97.5px);
    }
  }
`;

export default BallLoader;
