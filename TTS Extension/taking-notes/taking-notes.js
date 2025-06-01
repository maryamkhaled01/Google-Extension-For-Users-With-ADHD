let optionButtons = document.querySelectorAll(".option-button");

let formatButtons = document.querySelectorAll(".format")

let advOption = document.querySelectorAll(".adv-option-button")
let fontSizeRef = document.getElementById("fontSize");

let writingArea = document.getElementById("text-input");

const initializer = () => {
    //highlight buttons on clicking
    highlighter(formatButtons);

    //fontsize allows only till 7
    for(let i=1 ; i <= 7 ;i++){
        let option = document.createElement("option");
        option.value = i;
        option.innerHTML = i;
        fontSizeRef.appendChild(option);
    }
    
    fontSizeRef.value = 3;
};

const highlighter = (className) => {
    className.forEach((button) => {
        button.addEventListener("click", () => {
            let alreadyActive = false;

            if(button.classList.contains("active")){
                alreadyActive = true;
                button.classList.remove("active");
            }

            if(!alreadyActive){
                button.classList.add("active");
            }
            
        });
    });
};

//main logic

const modifyText = (command,defaultUi, value) => {
    //execCommand executes command on selected text
    document.execCommand(command,defaultUi,value);
};

optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        modifyText(button.id,false,null);
    });
 });


 advOption.forEach((select)=> {
    select.addEventListener("change",() => {
        modifyText(select.id,false,select.value);
    })
 })





window.onload = initializer();