import React from "react";
import Moves from "./Moves";

const Analysis = ({ moves }) => {
  return (
    <div className="moves-container">
      <Moves moves={moves} />
    </div>
  );
};

export default Analysis;
