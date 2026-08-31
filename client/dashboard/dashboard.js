document.getElementById("sessions-count").innerText = 12;
document.getElementById("rooms-count").innerText = 5;
document.getElementById("users-count").innerText = 18;

const ctx = document.getElementById("usersChart");

new Chart(ctx, {
  type: "bar",

  data: {
    labels: [
      "Siri",
      "John",
      "Alex",
      "Ram",
      "Keerthi"
    ],

    datasets: [{
      label: "User Contributions",

      data: [45, 32, 28, 20, 16],

      borderWidth: 1,
      borderRadius: 10
    }]
  },

  options: {
    responsive: true,

    plugins: {
      legend: {
        display: true
      }
    }
  }
});