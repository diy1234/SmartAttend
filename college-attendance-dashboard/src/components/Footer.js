import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#132E6B] text-white py-6 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-6">
        <h2 className="text-lg font-semibold">SmartAttend</h2>
        <div className="flex gap-6 mt-3 md:mt-0">
          <Link to="/about" className="hover:text-gray-300">
            About Us
          </Link>
          <Link to="/contact" className="hover:text-gray-300">
            Contact
          </Link>
          <a
            href="mailto:support@smartattend.com"
            className="hover:text-gray-300"
          >
            Support
          </a>
        </div>
        <p className="text-sm mt-4 md:mt-0">
          © {new Date().getFullYear()} SmartAttend. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
