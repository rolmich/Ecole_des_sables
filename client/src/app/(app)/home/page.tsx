"use client";

import React, { useState, useEffect } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function MyProfile() {
  return (
    <div
      className={inter.className}
      style={{
        backgroundColor: "var(--background-color)",
        height: "100%",
        border: "solid black",
      }}
    >
      <h1>My Profile</h1>
    </div>
  );
}
