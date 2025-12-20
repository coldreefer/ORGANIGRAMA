(() => {
  const wrapper = document.getElementById("diagramWrapper");

  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;

  wrapper.addEventListener("mousedown", e => {
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

  wrapper.addEventListener("mousemove", e => {
    if (!isDragging) return;
    e.preventDefault();

    wrapper.scrollLeft = scrollLeft - (e.pageX - startX);
    wrapper.scrollTop  = scrollTop  - (e.pageY - startY);
  });
})();
