import React from "react";

// Simple UserContext to share user and setUser across the app
export const UserContext = React.createContext({
  user: null,
  setUser: () => {},
});

export default UserContext;
