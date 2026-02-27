  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");

  // Hamburger menu toggle
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    mobileMenu.classList.toggle("active");
  });

  // Smooth scroll for all navigation links
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default anchor jump
      const targetId = link.getAttribute("href"); // Get the href (e.g., #About Us)
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerHeight = document.querySelector(".float-head").offsetHeight; // Get fixed header height
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight; // Adjust for header

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth" // Smooth scroll
        });
      }

      // Close mobile menu after clicking a link
      hamburger.classList.remove("active");
      mobileMenu.classList.remove("active");
    });
  });
