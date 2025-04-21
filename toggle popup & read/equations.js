function getRandomEquation() {
    const equationTypes = ['arithmetic', 'derivative', 'algebra'];
    const type = equationTypes[Math.floor(Math.random() * equationTypes.length)];

    switch (type) {
        case 'arithmetic':
            return generateArithmeticEquation();
        case 'derivative':
            return generateDerivativeEquation();
        case 'algebra':
            return generateAlgebraEquation();
        default:
            return "Solve: 2 + 2 = ?";
    }
}

function generateArithmeticEquation() {
    const operators = ['+', '-', '×', '÷'];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const num3 = Math.floor(Math.random() * 10) + 1;
    const op1 = operators[Math.floor(Math.random() * operators.length)];
    const op2 = operators[Math.floor(Math.random() * operators.length)];

    return `Solve: ${num1} ${op1} ${num2} ${op2} ${num3} = ?`;
}

function generateDerivativeEquation() {
    const functions = ['x²', 'x³', 'sin(x)', 'cos(x)', 'e^x'];
    const func = functions[Math.floor(Math.random() * functions.length)];

    return `What is the derivative of ${func}?`;
}

function generateAlgebraEquation() {
    const variables = ['x', 'y', 'z'];
    const var1 = variables[Math.floor(Math.random() * variables.length)];
    const var2 = variables[Math.floor(Math.random() * variables.length)];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const num3 = Math.floor(Math.random() * 10) + 1;
    const num4 = Math.floor(Math.random() * 10) + 1;

    return `If ${var1} + ${var2} = ${num1} and ${var1} - ${var2} = ${num2}, find ${var1} and ${var2}.`;
}

// Export the function for use in other files
export { getRandomEquation };