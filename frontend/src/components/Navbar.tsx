import React from 'react';
import UserNavbar from './nav/UserNavbar';

// Deprecated: use UserNavbar or AdminNavbar within layouts instead.
const Navbar: React.FC = () => {
  return <UserNavbar />;
};

export default Navbar;