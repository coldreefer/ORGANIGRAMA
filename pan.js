/* ======================================================
   PAN GLOBAL DEL LIENZO (drag = mover todo)
   ====================================================== */
(() => {
  const wrapper = document.getElementById("diagramWrapper");

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  wrapper.addEventListener("mousedown", (e) => {
    // No interferir con botones
    if (e.target.closest(".controls")) return;

    isDragging = true;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = wrapper.scrollLeft;
    scrollTop = wrapper.scrollTop;
    wrapper.classList.add("dragging");
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    wrapper.classList.remove("dragging");
  });

  wrapper.addEventListener("mouseleave", () => {
    isDragging = false;
    wrapper.classList.remove("dragging");
  });

  wrapper.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    wrapper.scrollLeft = scrollLeft - dx;
    wrapper.scrollTop  = scrollTop  - dy;
  });
})();
