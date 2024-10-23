

// Entry point of the program
if (import.meta.main) { 
  console.log("Witaj w Górniczej Dolinie!");
  const my_port = prompt("Podaj port na jakim będę działać:", "5801");
  console.log(`Mój port to: ${my_port}`);


  const init = confirm("Czy chcesz zainicjować kopalnię?");
  if (init) {
    console.log("Kopalnia została zainicjowana!");
  }
  else {
    console.log("Do jakiej kopalni się dołączyć?");
    const quarry_ip = prompt("Podaj adres kopalni:", "127.0.0.1");
    const quarry_port = prompt("Podaj port kopalni:", "5801");
    console.log(`Dołączam do kopalni: ${quarry_ip}:${quarry_port}`);
  }
}
