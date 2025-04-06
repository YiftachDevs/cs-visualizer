/*
public static void Main()
{
    double[] doubleArr = new double[(4 / (5 - 3) + 8 * (12 - 4) * 16) % 8];
    FillDoubleArray(doubleArr);
}

public static int Rec(int a)
{
    if (a == 1)
    {
        return 1;
    }

    if (a % 2 == 0)
    {
        return Rec(a / 2) + 1;
    }

    return Rec(a * 3 + 1) + 1;
}

public static void FillDoubleArray(double[] arr)
{
    for (int i = 0; i < arr.Length; i++)
    {
        arr[i] = i;
    }
}
*/
const socket = io();

// Load Monaco Editor
require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });

require(["vs/editor/editor.main"], function () {
    
    monaco.editor.defineTheme("myCustomTheme", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "#42a5f5" }, // Keywords
            { token: "control", foreground: "#ce93d8" }, // Code flow (if, else, return)
            { token: "variable", foreground: "#80deea" }, // Variables
            { token: "constant", foreground: "#26c6da" }, // Null / constants
            { token: "function", foreground: "#e6ee9c" }, // Functions
            { token: "type", foreground: "#4dd0e1" }, // Class names
            { token: "operator", foreground: "#C8D1DF" }, // Operators (+, -, *, etc.)
            { token: "number", foreground: "#a5d6a7" }, // Numbers
            { token: "boolean", foreground: "#f06292" }, // Boolean (true, false)
            { token: "string", foreground: "#ffcc80" }, // Text (string literals)
            { token: "special", foreground: "#ffee58" }, // Special text (not a built-in token, might need customization)
            { token: "comment", foreground: "#388e3c" } // Comments
        ],
        colors: {
            "editor.background": "#0E131B", // Blue background (adjust as needed)
            "editor.lineHighlightBackground": "#121c2b", // Current line highlight
            "editorLineNumber.foreground": "#2b3b54" // Line number color
        }
    });

    window.editor = monaco.editor.create(document.getElementById("editor"), {
        value:
        `public static void Main()
{
    int num = 123;
    num = 123;
    num = 4;
    
    int[][,] arr = { new int[,] {{1 - 1}, {2 - 1}}, new int[,] {{3 + 1}} };
    int[][][] arr2 = { new int[][] {new int[] {1 - 1}, new int[]{2 - 1}}, new int[][] {new int[] {3 + 1}, new int[] {2 - (1 * 1)}} };

    int a = 3, rec = Rec(5);
    Console.WriteLine("Hello World: " + (((rec + a))));

    double[] doubleArr = new double[rec % 8];
    FillDoubleArray(doubleArr);
}

public static int Rec(int a)
{
    if (a == 1)
    {
        return 1;
    }

    if (a % 2 == 0)
    {
        return Rec(a / 2) + 1;
    }

    return Rec(a * 3 + 1) + 1;
}

public static void FillDoubleArray(double[] arr)
{
    for (int i = 0; i < arr.Length; i++)
    {
        arr[i] = i;
    }
}`,
        language: "csharp",
        theme: "myCustomTheme",
        fontSize: 20, // Increased font size
        lineHeight: 30, // Adjusted line height for readability
    });
});

window.addEventListener("resize", () => {
    editor.layout({ width: 0, height: 0 });
    const container = document.getElementById("editor-container"); // Ensure you have this
    editor.layout({ width: container.clientWidth, height: container.clientHeight });
});

let UI = {};

document.addEventListener("DOMContentLoaded", () => {
    UI = {
        codeEditor: document.getElementById("editor"),
        playPauseButton: document.getElementById("playPauseButton"),
        stepButton: document.getElementById("stepButton"),
        refreshButton: document.getElementById("refreshButton"),
        tokenContainer: document.getElementById("tokenContainer"),
        tokenContainerContainer: document.getElementById("tokenContainerContainer"),
        console: document.getElementById("console"),
        consoleContainer: document.getElementById("consoleContainer")
    }

    UI.refreshButton.onclick = onRefreshButtonClick;
    UI.stepButton.onclick = onStepButtonClick;
    UI.playPauseButton.onclick = onPlayPauseButtonClick;

    tokenLines = UI.tokenContainer.children;
});

socket.on("output", (message, autoPlay) => {
    if (message != "Compilation successful!") {
        UI.console.children[0].innerHTML = message;
        return;
    }

    UI.console.children[0].innerHTML = "Compilation successful!\n\n";

    tokens = [];
    tokenIter = null;

    funcMap = new Map();
    varStack = [];

    tabsOffset = 0;
    virtualLine = -1;
    virtualIdx = 0;
    lineBaseOffset = 0;
    shouldContinueLoop = false;
    shouldBreakLoop = false;
    shouldReturnFunction = false;
    bracketColorCycler = 0;

    tempVarCounter = 0;

    curVarCreationType = null;
    curVarCreationIndex = 0;
    curArrayContextType = null;

    controller = null;
    signal = null;
    resolveStep = null;
    timerActive = false;
    timerInterval = null;

    savedStacks = [];
    arrHeap = [];

    controller = new AbortController();
    signal = controller.signal;

    UI.tokenContainer.innerHTML = "";
    
    const codeScript = "public static class Program\n{\n" + window.editor.getValue() + "\n}";

    retrieveTokens(codeScript);

    tokenIter = {
        index: 0,
        iter: function(count = 1) {
            this.index += count;
        },
        value: function() {
            if (this.index >= tokens.length) return null;
            return tokens[this.index];
        },
        hasNext: function() {
            return this.index < tokens.length;
        },
        set: function(newIdx) {
            this.index = newIdx;
        }
    };

    // Skip "public static class Program..."
    while (tokenIter.value() != "{") {
        tokenIter.iter();
    }

    tokenIter.iter();

    while (tokenIter.hasNext()) {
        // Found a function definition
        if (tokenIter.value() == "public" || tokenIter.value() == "static") {
            funcObj = new FunctionObject();
            funcMap.set(funcObj.funcName, funcObj);
        } else {
            tokenIter.iter(); // whitespace
            // is that an omori reference?
            // perchance.
        }
    }

    if (autoPlay) {
        onPlayPauseButtonClick();
    }

    funcMap.get("Main").interpret();
});

const Theme = {
    LineNumberColor: "#2b3b54",
    KeywordColor: "#42a5f5",
    CodeFlowColor: "#ce93d8",
    VarColor: "#80deea",
    NullColor: "#b39ddb",
    FunctionColor: "#e6ee9c",
    ClassColor: "#4dd0e1",
    OperatorColor: "#C8D1DF",
    NumberColor: "#a5d6a7",
    BoolColor: "#f06292",
    TextColor: "#ffcc80",
    SpecialTextColor: "#ffee58",
    CurLineColor: "#121c2b",
    CommentColor: "#388e3c",
    BracketsColors: ["#ffd700", "#da70d6", "#179fff"]
}

class FunctionObject {
    // The token iterator should point to the token "public"
    constructor() {
        tokenIter.iter();
        if (tokenIter.value() == "static") {
            tokenIter.iter();
        }

        virtualLine = 0;
        virtualIdx = 4;

        this.funcType = TypeObject.fromDecleration();
        virtualIdx++;
        this.funcName = tokenIter.value();
        tokenIter.iter(); // Skip the name token, now pointing to token "("
        virtualIdx++;

        bracketColorCycler = (bracketColorCycler + 1) % 3;

        this.funcArgs = this.buildFuncArgs();
        iterVirtualLine();

        bracketColorCycler = (bracketColorCycler + 2) % 3;

        // Push the given args to the stack
        for (let i = 0; i < this.funcArgs.length; i++) {
            let arg = deepClone(this.funcArgs[i]);
            varStack.push(arg);
        }

        if (this.funcName != "Main") {
            virtualLine++;
        }

        this.funcScope = new ScopeObject();
        this.height = this.funcScope.height + 1;

        if (this.funcName != "Main") {
            this.height += 1;
        }

        for (let i = 0; i < this.funcArgs.length; i++) {
            varStack.pop();
        }
    }

    // The token iterator should point to the token "("
    buildFuncArgs() {
        const funcArgs = [];
        let curArg;

        tokenIter.iter(); // Skip the token "("
        virtualIdx += 2;
        while (tokenIter.value() != ")") {
            curArg = VariableObject.fromDecleration();
            virtualIdx += 4;

             // If the token "," was found, skip it. Now pointing to the next arg's type
            if (tokenIter.value() == ",") {
                tokenIter.iter();
                virtualIdx += 2;
            }
            funcArgs.push(curArg);
        }
        tokenIter.iter();
        virtualIdx++;

        return funcArgs;
    }

    async interpret() {
        virtualLine = -1;
        virtualIdx = 0;
        tabsOffset = 0;
    
        // Visualize the function
        if (this.funcName != "Main")
        {
            newLine();
            virtualLine = 0;
        }

        newLine();
        pushToken("public", Theme.KeywordColor, true);
        pushToken("static", Theme.KeywordColor, true);
        pushToken(this.funcType.type, Theme.KeywordColor, true);
        pushToken(this.funcName, Theme.FunctionColor, false);
        pushToken("(", Theme.OperatorColor, false);
    
        let argsValues = [];
    
        for (let i = 0; i < this.funcArgs.length; i++) {
            argsValues.push(varStack.pop().value);
        }
    
        argsValues.reverse();
    
        for (let i = 0; i < this.funcArgs.length; i++) {
            this.funcArgs[i].type.pushTokens();
            pushSpace();
            pushToken(this.funcArgs[i].name, Theme.VarColor, true);
            pushToken("=", Theme.OperatorColor, true);
    
            pushValueToken(argsValues[i], this.funcArgs[i].type);
    
            if (i < this.funcArgs.length - 1) {
                pushToken(",", Theme.OperatorColor, true);
            }
        }
    
        pushToken(")", Theme.OperatorColor, false);
    
        // Push the given args to the stack
        for (let i = 0; i < this.funcArgs.length; i++) {
            let arg = deepClone(this.funcArgs[i]);
            arg.value = argsValues[i];
            arg.valueAbsoluteTokenLine = virtualLine + lineBaseOffset;
            console.log("arg: " + arg.valueAbsoluteTokenLine);
            varStack.push(arg);
        }

        // Then, run the scope
        this.funcScope.pushTokens();
            
        UI.tokenContainerContainer.scrollTo({
            top: UI.tokenContainerContainer.scrollHeight,
            behavior: "smooth"
        });

        if (this.funcName == "Main")
        {
            await setCurLine(0);
        }
        else
        {
            await setCurLine(1);
        }

        let prevFunc = curFunc;
        curFunc = this;

        await this.funcScope.interpret();
    
        shouldReturnFunction = false;
    
        curFunc = prevFunc;
    
        if (this.funcName == "Main") {
            if (controller) {
                controller.abort();
                controller = null;
                resolveStep = null;
            }
            clearInterval(timerInterval);
            timerInterval = null;
            timerActive = false;
            UI.playPauseButton.innerHTML = "<i class=\"fa-solid fa-play\"></i><span class=\"shortcut\">Space</span>";
        }
    }
}

class VariableObject {
    constructor(type, name, value, absoluteTokenLine = null, virtualIdx = null) {
        this.type = type;
        this.name = name;
        this.value = value;
        this.valueAbsoluteTokenLine = absoluteTokenLine;
        this.valueTokenIdx = virtualIdx;
    }

    async refreshValue() {
        /*if (this.type.type == "array" && indexes.length > 0) {
            
            // arrHeap[this.value][indexes[0][0]] = value;
            let curTypeObj = this.type;
            let curHeapIndex = this.value;
            let curIndex;
            let curValueObj = arrHeap[curHeapIndex];

            for (const multiIndexes of indexes) {
                curTypeObj = deepClone(curTypeObj.arrayType);
                for (const index of multiIndexes) {
                    curIndex = index;
                    curValueObj = curValueObj[index];
                }
            }
                    virtualIdx++;
                    curTypeObj = deepClone(curTypeObj.arrayType);
                    curValueObj = arrHeap[curValueObj];
                    for (let i = 0; i < innerOperator.indexExpressions.length; i++) {
                        await innerOperator.indexExpressions[i].collapse();
                        virtualIdx += 2;
                        const index = varStack.pop().value;
                        curValueObj = curValueObj[index];
                        curIndex.push(index);
                    }
                    indexes.push(curIndex);
                    virtualIdx--;
                /*
                if (innerOperator.type == "index") {
                    const curIndex = [];
                    virtualIdx++;
                    if (curTypeObj.type == "array") {
                        curTypeObj = deepClone(curTypeObj.arrayType);
                        curValueObj = arrHeap[curValueObj];
                    } else if (curTypeObj.type == "string") {
                        curTypeObj = new TypeObject("char");
                    }
                    for (let i = 0; i < innerOperator.indexExpressions.length; i++) {
                        await innerOperator.indexExpressions[i].collapse();
                        virtualIdx += 2;
                        const index = varStack.pop().value;
                        curValueObj = curValueObj[index];
                        curIndex.push(index);
                    }
                    indexes.push(curIndex);
                    virtualIdx--;
                }
                

            for (const varObj of varStack) {
                console.log("eee var name: " + varObj.name + ", line: " + varObj.valueAbsoluteTokenLine + ", token idx: " + varObj.valueTokenIdx);

                if (varObj.type.type == "array" && varObj.value == this.value && varObj.valueTokenIdx != null) {
                    console.log("this!!");
                    mergeTokens(varObj.valueAbsoluteTokenLine - lineBaseOffset, varObj.valueTokenIdx, 1, this.type, this.value);
                }
            }
            for (const curStack of savedStacks) {
                for (const varObj of curStack) {
                    console.log("var name: " + varObj.name + ", line: " + varObj.valueAbsoluteTokenLine + ", token idx: " + varObj.valueTokenIdx);

                    if (varObj.type.type == "array" && varObj.value == this.value && varObj.valueTokenIdx != null) {
                        console.log("this!!");
                        mergeTokens(varObj.valueAbsoluteTokenLine - lineBaseOffset, varObj.valueTokenIdx, 1, this.type, this.value);
                    }
                }
            }
            await waitUntilStep();
        } else {
            this.value = value;
            await mergeTokens(this.valueAbsoluteTokenLine - lineBaseOffset, this.valueTokenIdx, 1, this.type, this.value);
        }*/

        const savedBracketColorCyclerIndex = bracketColorCycler;
        bracketColorCycler = this.bracketColorCyclerIndex;
        await updateToken(this.valueAbsoluteTokenLine - lineBaseOffset, this.valueTokenIdx, this.type, this.value);
        bracketColorCycler = savedBracketColorCyclerIndex;
    }

    static fromDecleration(knownType = null) {
        let varObj = new VariableObject(null, null, null);
        if (knownType) {
            varObj.type = knownType;
        } else {
            varObj.type = TypeObject.fromDecleration();
            virtualIdx++;
        }
        varObj.name = tokenIter.value();
        tokenIter.iter();
        virtualIdx++;
        varObj.value = null;
        varObj.valueAbsoluteTokenLine = lineBaseOffset + virtualLine;
        varObj.valueTokenIdx = virtualIdx + 3;
        varObj.bracketColorCyclerIndex = bracketColorCycler;
        return varObj;
    }
}

class TypeObject {
    // The token iterator should point to the type's first token
    constructor(type, arrayType = null, arrayDimentions = 1) {
        this.type = type;
        this.arrayType = arrayType;
        this.arrayDimentions = arrayDimentions;
        this.length = this.calcLength();
    }

    calcLength() {
        if (this.type != "array") {
            return 1;
        }
        return this.arrayType.calcLength() + this.arrayDimentions + 1;
    }

    static fromDecleration() {
        let baseTypeText = tokenIter.value();
        tokenIter.iter();
        virtualIdx++;

        return TypeObject.arrayHelperFunction(baseTypeText);
    }

    static arrayHelperFunction(baseTypeText) {
        if (tokenIter.value() != "[") {
            return new TypeObject(baseTypeText);
        }
        tokenIter.iter();
        virtualIdx++;
        let arrayDimentions = 1;
        while (tokenIter.value() == ",") {
            tokenIter.iter();
            virtualIdx++;
            arrayDimentions++;
        }
        tokenIter.iter();
        virtualIdx++;
        return new TypeObject("array", TypeObject.arrayHelperFunction(baseTypeText), arrayDimentions);
    }

    getHTMLTokensArrayHelperFunction(htmlTokens, addFadeIn = true) {
        let tempType = this;

        while (tempType.type == "array") {
            htmlTokens.push(getTokenHTML("[", Theme.OperatorColor, addFadeIn));
            for (let i = 0; i < tempType.arrayDimentions - 1; i++) {
                htmlTokens.push(getTokenHTML(",", Theme.OperatorColor, addFadeIn));
            }
            htmlTokens.push(getTokenHTML("]", Theme.OperatorColor, addFadeIn));
            tempType = tempType.arrayType;
        }
    }

    pushArrayBaseType(htmlTokens, addFadeIn = true) {
        let tempType = this;

        while (tempType.type == "array") {
            tempType = tempType.arrayType;
        }

        htmlTokens.push(getTokenHTML(tempType.type, Theme.KeywordColor, addFadeIn));
    }

    pushTokens() {
        const htmlTokens = [];
        this.pushArrayBaseType(htmlTokens);
        this.getHTMLTokensArrayHelperFunction(htmlTokens);
        for (const htmlToken of htmlTokens) {
            pushHTMLToken(htmlToken);
        }
    }
}

class ScopeObject {
    // The token iterator should point to the token "{"
    constructor() {
        console.log("scopeimum: " + tokenIter.value());
        tokenIter.iter();
        iterVirtualLine();
        
        this.statements = [];
        let prevVarStackSize = varStack.length;

        this.height = 2;

        bracketColorCycler = (bracketColorCycler + 1) % 3;
        
        while (tokenIter.value() != "}") {
            console.log("starting scope statment: " + tokenIter.value());
            this.statements.push(new StatementObject());
            this.height += this.statements[this.statements.length - 1].height;
        }

        bracketColorCycler = (bracketColorCycler + 2) % 3;

        tokenIter.iter();

        while (varStack.length > prevVarStackSize) {
            varStack.pop();
        }

        console.log("scope ended");

        iterVirtualLine();
    }

    pushTokens() {
        newLine();
        pushToken("{", Theme.OperatorColor, false);
        offsetTabs(4);
        for (let statement of this.statements) {
            statement.pushTokens();
        }
        offsetTabs(-4);
        newLine();
        pushToken("}", Theme.OperatorColor, false);
    }

    async interpret() {
        iterCurLine();
        let prevVarStackSize = varStack.length;
        let prevVirtualLine = virtualLine;
        tabsOffset += 4;
        for await (let statement of this.statements) {
            await statement.interpret();
            
            if (shouldReturnFunction || shouldContinueLoop || shouldBreakLoop) {
                tabsOffset -= 4;
                while (varStack.length > prevVarStackSize) {
                    varStack.pop();
                }
                setCurLine(prevVirtualLine + this.height - 1);
                return;
            }
        }
        while (varStack.length > prevVarStackSize) {
            varStack.pop();
        }
        tabsOffset -= 4;
        iterCurLine();
    }
}

class StatementObject {
    constructor() {
        this.height = 1;
        if (tokenIter.value() == "\n") {
            this.type = "newLine";
            tokenIter.iter();
        } else if (tokenIter.value() == "//" || tokenIter.value() == "//inLine") {
            this.type = tokenIter.value() == "//" ? "comment" : "inLineComment";
            tokenIter.iter();
            this.comment = tokenIter.value();
            tokenIter.iter();
        } else if (curVarCreationType || isTokenType(tokenIter.value())) {
            // Variable creation
            this.type = "varCreation";
            this.varObj = VariableObject.fromDecleration(curVarCreationType);
            
            this.isInLine = curVarCreationType != null;

            if (!curVarCreationType) {
                curVarCreationType = this.varObj.type;
                curVarCreationIndex = this.varObj.type.length + 6;
                this.varObj.valueTokenIdx = curVarCreationIndex;
                curVarCreationIndex += 7;
            } else {
                this.height = 0;
                this.varObj.valueTokenIdx = curVarCreationIndex;
                curVarCreationIndex += 7;
            }

            if (this.varObj.type.type == "array") {
                curArrayContextType = this.varObj.type;
            }

            if (tokenIter.value() == ";" || tokenIter.value() == ",") {
                this.isEndingLine = tokenIter.value() == ";";
                if (tokenIter.value() == ";") {
                    curVarCreationType = null;
                }
                tokenIter.iter();
                virtualIdx += 2;
                this.expression = new ExpressionObject(this.varObj.type, this.varObj.type);
            } else {
                tokenIter.iter();
                virtualIdx += 3;
                this.expression = new ExpressionObject(this.varObj.type);

                this.isEndingLine = false;
                if (tokenIter.value() == ";") {
                    curVarCreationType = null;
                    this.isEndingLine = true;
                }
                tokenIter.iter();
                virtualIdx += 2;
            }

            varStack.push(this.varObj);
        } else if (tokenIter.value() == "if") {
            this.type = "ifStatement";
            this.expressions = [];
            this.scopes = [];
            this.height = 0;
            while (true) {
                console.log("asd: " + tokenIter.value());
                if (tokenIter.value() == "else") {
                    tokenIter.iter();
                    virtualIdx += 2;
                }
                if (tokenIter.value() == "if") {
                    tokenIter.iter(2);
                    virtualIdx += 3;
                    console.log("expr: " + tokenIter.value());
                    this.expressions.push(new ExpressionObject());
                    console.log("expr e: " + tokenIter.value());
                    tokenIter.iter();
                    iterVirtualLine();
                    this.scopes.push(new ScopeObject());    
                    this.height += this.scopes[this.scopes.length - 1].height + 1;
                } else {
                    if (tokenIter.value() == "{") {
                        iterVirtualLine();
                        this.scopes.push(new ScopeObject());
                        this.height += this.scopes[this.scopes.length - 1].height + 1;
                    }
                    break;
                }
            }

            return;
        } else if (tokenIter.value() == "while") {
            this.type = "whileStatement";
            tokenIter.iter(2);
            virtualIdx += 3;
            this.expression = new ExpressionObject();
            tokenIter.iter();
            iterVirtualLine();
            this.scope = new ScopeObject();
            this.height = this.scope.height + 1;

            return;
        } else if (tokenIter.value() == "for") {
            this.type = "forStatement";
            tokenIter.iter(2);
            virtualIdx += 3;

            this.counter = VariableObject.fromDecleration();
            tokenIter.iter();
            virtualIdx += 3;
            this.counterExpression = new ExpressionObject();
            tokenIter.iter();
            virtualIdx += 2;
            varStack.push(this.counter);

            this.conditionExpression = new ExpressionObject();
            tokenIter.iter();
            virtualIdx += 2;

            this.assignmentExpression = new AssignmentExpression();
            tokenIter.iter();

            iterVirtualLine();

            this.scope = new ScopeObject();
            varStack.pop();
            this.height = this.scope.height + 1;

            return;
        } else if (tokenIter.value() == "break" || tokenIter.value() == "continue") {
            this.type = tokenIter.value();
            tokenIter.iter(2);
            virtualIdx += 2;
        } else if (tokenIter.value() == "return") {
            this.type = "return";
            tokenIter.iter();
            virtualIdx++;
            this.hasReturnValue = false;

            if (tokenIter.value() != ";") {
                this.hasReturnValue = true;
                virtualIdx++;
                this.expression = new ExpressionObject();
            }

            tokenIter.iter();
            virtualIdx++;    // not that neccesary mate ay?
            // its better this way mate
            // sure, mate
        } else if (tokenIter.value() == "Console") {
            // Must be Console.WriteLine cause im NOT supporting static classes lol
            this.type = "consoleWrite";
            tokenIter.iter(2);
            this.consoleWriteNewLine = tokenIter.value() == "WriteLine";
            tokenIter.iter(2);
            virtualIdx += 4;
            if (tokenIter.value() != ")") {
                this.expression = new ExpressionObject();
            }
            tokenIter.iter(2);
            virtualIdx++;
        } else {
            tokenIter.iter();

            if (tokenIter.value() == "(") {
                tokenIter.iter(-1);
                this.type = "functionCall";
                this.funcName = tokenIter.value();
                tokenIter.iter();
                virtualIdx++;
                this.givenArgsExpressions = buildGivenArgsExpressions();
                tokenIter.iter();
                virtualIdx++;
            } else {
                tokenIter.iter(-1);

                // Variable assignment
                this.type = "varAssignment";

                this.assignmentExpression = new AssignmentExpression();
                tokenIter.iter();
            }
        }

        if (tokenIter.value() != "//inLine" && !curVarCreationType) {
            iterVirtualLine();
        }
    }

    pushTokens() {
        if (this.type == "inLineComment") {
            pushToken(" //" + this.comment, Theme.CommentColor, false);
            return;
        }

        if (this.type == "varCreation") {
            if (this.isInLine) {
                pushToken(this.varObj.name, Theme.VarColor, true);
                pushToken("=", Theme.OperatorColor, true);
                this.expression.pushTokens();
            } else {
                newLine();
                this.varObj.type.pushTokens();
                pushSpace();
                pushToken(this.varObj.name, Theme.VarColor, true);
                pushToken("=", Theme.OperatorColor, true);
                this.expression.pushTokens();
            }
            if (this.isEndingLine) {
                pushToken(";", Theme.OperatorColor, false);
            } else {
                pushToken(",", Theme.OperatorColor, true);
            }
            return;
        }

        newLine();
        
        if (this.type == "comment") {
            pushToken("//" + this.comment, Theme.CommentColor, false);
        } else if (this.type == "ifStatement") {
            pushToken("if", Theme.CodeFlowColor, true);
            pushToken("(", Theme.OperatorColor, false);
            this.expressions[0].pushTokens();
            pushToken(")", Theme.OperatorColor, false);
            this.scopes[0].pushTokens();
            if (this.scopes.length > 1) {
                newLine();
            }
            for (let i = 1; i < this.expressions.length; i++) {
                pushToken("else if", Theme.CodeFlowColor, true);
                pushToken("(", Theme.OperatorColor, false);
                this.expressions[i].pushTokens();
                pushToken(")", Theme.OperatorColor, false);
                this.scopes[i].pushTokens();
                if (i < this.scopes.length - 1) {
                    newLine();
                }
            }
            if (this.scopes.length > this.expressions.length) {
                pushToken("else", Theme.CodeFlowColor, false);
                this.scopes[this.scopes.length - 1].pushTokens();
            }
        } else if (this.type == "whileStatement") {
            pushToken("while", Theme.CodeFlowColor, true);
            pushToken("(", Theme.OperatorColor, false);
            this.expression.pushTokens();
            pushToken(")", Theme.OperatorColor, false);
            this.scope.pushTokens();
        } else if (this.type == "forStatement") {
            pushToken("for", Theme.CodeFlowColor, true);
            pushToken("(", Theme.OperatorColor, false);
            this.counter.type.pushTokens();
            pushSpace();
            pushToken(this.counter.name, Theme.VarColor, true);
            pushToken("=", Theme.OperatorColor, true);
            this.counterExpression.pushTokens();
            pushToken(";", Theme.OperatorColor, true);
            this.conditionExpression.pushTokens();
            pushToken(";", Theme.OperatorColor, true);
            this.assignmentExpression.pushTokens();
            pushToken(")", Theme.OperatorColor, false);
            this.scope.pushTokens();
        } else if (this.type == "break" || this.type == "continue") {
            pushToken(this.type, Theme.CodeFlowColor, false);
            pushToken(";", Theme.OperatorColor, false);
        } else if (this.type == "varAssignment") {
            this.assignmentExpression.pushTokens();
            pushToken(";", Theme.OperatorColor, false);
        } else if (this.type == "return") {
            pushToken("return", Theme.CodeFlowColor, false);
            if (this.hasReturnValue) {
                pushSpace();
                this.expression.pushTokens();
            }
            pushToken(";", Theme.OperatorColor, false);
        } else if (this.type == "functionCall") {
            pushToken(this.funcName, Theme.FunctionColor, false);
            pushToken("(", Theme.OperatorColor, false);
            for (let i = 0; i < this.givenArgsExpressions.length; i++) {
                this.givenArgsExpressions[i].pushTokens();
                if (i < this.givenArgsExpressions.length - 1) {
                    pushToken(",", Theme.OperatorColor, true);
                }
            }
            pushToken(")", Theme.OperatorColor, false);
            pushToken(";", Theme.OperatorColor, false);
        } else if (this.type == "consoleWrite") {
            pushToken("Console", Theme.ClassColor, false);
            pushToken(".", Theme.OperatorColor, false);
            if (this.consoleWriteNewLine) {
                pushToken("WriteLine", Theme.FunctionColor, false);
            } else {
                pushToken("Write", Theme.FunctionColor, false);
            }
            pushToken("(", Theme.OperatorColor, false);
            if (this.expression) {
                this.expression.pushTokens();
            }
            pushToken(")", Theme.OperatorColor, false);
            pushToken(";", Theme.OperatorColor, false);
        }
    }

    async interpret() {
        if (this.type == "varCreation") { // int[] arrr = new int[3], arrrrrrr = null;
            if (!this.isInLine) {
                await iterCurLine(); 
            }
            virtualIdx = this.varObj.valueTokenIdx;
            await this.expression.collapse();
            virtualIdx++;

            let value = varStack[varStack.length - 1].value;
            varStack[varStack.length - 1] = deepClone(this.varObj);
            varStack[varStack.length - 1].value = value;
            varStack[varStack.length - 1].valueAbsoluteTokenLine = virtualLine + lineBaseOffset;
            return;
        }
        
        if (this.type == "inLineComment") {

        } else if (this.type == "comment" || this.type == "newLine") {
            iterCurLine();
        } else {
            await iterCurLine(); 
        }

        if (this.type == "break") {
            shouldBreakLoop = true;
            return;
        } else if (this.type == "continue") {
            shouldContinueLoop = true;
            return;
        } else if (this.type == "ifStatement") {
            let savedVirtualLine = virtualLine;
            let foundValue = false;
            for (let i = 0; i < this.scopes.length - 1; i++) {
                virtualIdx += 3;
                await this.expressions[i].collapse();
                let value = varStack[varStack.length - 1].value;
                varStack.pop();
    
                if (value) {
                    await this.scopes[i].interpret();
                    setCurLine(savedVirtualLine + this.height - 1);
                    foundValue = true;
                    break;
                } else {
                    await setCurLine(virtualLine + this.scopes[i].height + 1);
                }
            }     
            if (!foundValue) {
                if (this.scopes.length == this.expressions.length) {
                    virtualIdx += 3;
                    await this.expressions[this.expressions.length - 1].collapse();
                    let value = varStack[varStack.length - 1].value;
                    varStack.pop();
        
                    if (value) {
                        await this.scopes[this.scopes.length - 1].interpret();
                    } else {
                        setCurLine(virtualLine + this.scopes[this.scopes.length - 1].height);
                    }
                } else {
                    await this.scopes[this.scopes.length - 1].interpret();
                }
            }     
        } else if (this.type == "forStatement") {
            virtualIdx += 9;
            await this.counterExpression.collapse();
            let value = varStack[varStack.length - 1].value;
            varStack[varStack.length - 1] = deepClone(this.counter);
            varStack[varStack.length - 1].value = value;
            varStack[varStack.length - 1].valueAbsoluteTokenLine = virtualLine + lineBaseOffset;

            virtualIdx += 2;

            let savedVirtualIdx = virtualIdx;
            let savedVirtualLine = virtualLine;

            while (true) {
                await this.conditionExpression.collapse();
                let value = varStack[varStack.length - 1].value;
                varStack.pop();
    
                if (value) {
                    await this.scope.interpret();

                    if (shouldReturnFunction || shouldBreakLoop) {
                        shouldBreakLoop = false;
                        break;
                    }
                    if (shouldContinueLoop) {
                        shouldContinueLoop = false;
                    }
                    await setCurLine(savedVirtualLine);
                    virtualIdx = savedVirtualIdx + 3;
                    await this.assignmentExpression.collapse();

                    virtualIdx = savedVirtualIdx;
                    await removeTokens(virtualIdx, 3 + this.assignmentExpression.length);
                    await removeTokenLines(savedVirtualLine + 1, this.scope.height);
                    this.conditionExpression.pushTokens();
                    pushToken(";", Theme.OperatorColor, true);
                    this.assignmentExpression.pushTokens();
                    this.scope.pushTokens();
                    virtualLine = savedVirtualLine;
                    virtualIdx = savedVirtualIdx;
                    await waitUntilStep();
                } else {
                    setCurLine(savedVirtualLine + this.height - 1);
                    break;
                }
            }

            varStack.pop();
        } else if (this.type == "whileStatement") {
            virtualIdx += 3;
            let savedVirtualIdx = virtualIdx;
            let savedVirtualLine = virtualLine;

            while (true) {
                await this.expression.collapse();
                let value = varStack[varStack.length - 1].value;
                varStack.pop();
    
                if (value) {
                    await this.scope.interpret();
                    if (shouldReturnFunction || shouldBreakLoop) {
                        shouldBreakLoop = false;
                        break;
                    }
                    if (shouldContinueLoop) {
                        shouldContinueLoop = false;
                    }

                    setCurLine(savedVirtualLine);
                    virtualIdx = savedVirtualIdx;
                    removeTokens(virtualIdx, 1);
                    removeTokenLines(savedVirtualLine + 1, this.scope.height);
                    this.expression.pushTokens();
                    this.scope.pushTokens();
                    virtualLine = savedVirtualLine;
                    virtualIdx = savedVirtualIdx;
                    await waitUntilStep();
                } else {
                    setCurLine(savedVirtualLine + this.height - 1);
                    break;
                }
            }
        } else if (this.type == "return") {
            if (this.hasReturnValue) {
                virtualIdx += 2;
                await this.expression.collapse();
                returnVar = deepClone(varStack[varStack.length - 1]);
                returnVarLine = virtualLine;
                varStack.pop();
            }
            virtualIdx++;
            shouldReturnFunction = true;
        } else if (this.type == "varAssignment") {
            await this.assignmentExpression.collapse();
        } else if (this.type == "functionCall") {
            virtualIdx += 2;
            for await (let givenArg of this.givenArgsExpressions) {
                await givenArg.collapse();
                virtualIdx += 3;
            }
            virtualIdx += 2;
            await callFunction(this.funcName, -1, -1, this.givenArgsExpressions.length);
        } else if (this.type == "consoleWrite") {
            virtualIdx += 4;
            let outputValue;
            if (this.expression) {
                await this.expression.collapse();
                let output = deepClone(varStack[varStack.length - 1]);
                outputValue = output.value;
            } else {
                outputValue = "";
            }

            if (this.consoleWriteNewLine) {
                await logToUIConsole(outputValue + "\n");
            } else {
                await logToUIConsole(outputValue);
            }

            if (this.expression) {
                varStack.pop();
            }
        }
    }
}

class AssignmentExpression {
    constructor() {
        this.exprItem = new ExpressionItemObject();
        
        this.operator = tokenIter.value();
        tokenIter.iter();
        virtualIdx++;

        if (this.operator[this.operator.length - 1] == "=") {
            virtualIdx += 2;
            this.expression = new ExpressionObject();
            this.length = this.exprItem.length + 3 + this.expression.length;
        } else {
            this.length = this.exprItem.length + 1;
        }
    }

    pushTokens() {
        this.exprItem.pushTokens();
        if (this.expression) {
            pushSpace();
            pushToken(this.operator, Theme.OperatorColor, true);
            this.expression.pushTokens();
        } else {
            pushToken(this.operator, Theme.OperatorColor, false);
        }
    }

    async collapse() {  
        let [varObj, curValueParentObj, curValueParentIndex, typeObj, valueObj] = await this.exprItem.collapse(true); // num = 123;

        if (this.expression) {
            const firstChar = this.operator[0];

            if (firstChar != "=") {
                pushTempVar(typeObj, valueObj);
            }

            virtualIdx += 3;
            await this.expression.collapse();

            if (firstChar != "=") {
                await popOperator(new OperatorObject(firstChar), virtualIdx - this.exprItem.length - 3, false, false);
            }

            if (typeObj.type != varStack[varStack.length - 1].type.type) {
                const resultVar = varStack.pop();
                const newValue = typeCast(resultVar.value, resultVar.type, typeObj);
                pushTempVar(typeObj, newValue);
                await mergeTokens(virtualLine, virtualIdx - this.exprItem.length, 1, typeObj, newValue);
            }

            // if (!typeObj.type == "array" && typeObj.type != varStack[varStack.length - 1].type.type) {
            //     const resultVar = varStack.pop();
            //     const newValue = typeCast(resultVar.value, resultVar.type, typeObj);
            //     pushTempVar(typeObj, newValue);
// 
            //     if (firstChar == '=') {
            //         if (this.indexing) {
            //             await mergeTokens(virtualLine, savedTokenIdx + 7, 1, varObjType, newValue);
            //         } else {
            //             await mergeTokens(virtualLine, savedTokenIdx + 4, 1, varObjType, newValue);
            //         }
            //     }
            // }

            valueObj = varStack[varStack.length - 1].value;
            varStack.pop();
        } else {
            if (this.operator == "++") {
                if (typeObj.type == "char") {
                    valueObj = String.fromCharCode(valueObj.charCodeAt(0) + 1)[0];
                } else {
                    valueObj = valueObj + 1;
                }
            } else {
                if (typeObj.type == "char") {
                    valueObj = String.fromCharCode(valueObj.charCodeAt(0) - 1)[0];
                } else {
                    valueObj = valueObj - 1;
                }
            }
        }
        
        if (varObj.type.type == "array" && this.exprItem.innerOperators.length > 0) {
            curValueParentObj[curValueParentIndex] = valueObj;
            for (const curVarObj of varStack) {
                if (curVarObj.type.type == "array" && curVarObj.valueTokenIdx != null) {
                    curVarObj.refreshValue();
                }
            }
            for (const curStack of savedStacks) {
                for (const curVarObj of curStack) {
                    if (curVarObj.type.type == "array" && curVarObj.valueTokenIdx != null) {
                        curVarObj.refreshValue();
                    }
                }
            }
            await waitUntilStep();
        } else {
            varObj.value = valueObj;
            await varObj.refreshValue();
        }
    }
}

class OperatorObject {
    constructor(text) {
        this.text = text;
        this.priority = OperatorObject.getPriority(this.text);
    }

    static getPriority(text) {
        let priority = -1;
        if (text == "||") priority = 0;
        else if (text == "&&") priority = 1;
        else if (text == "==" || text == "!=") priority = 2;
        else if (text == "<" || text == ">" || text == "<=" || text == ">=") priority = 3;
        else if (text == "+" || text == "-") priority = 4;
        else if (text == "*" || text == "/" || text == "%") priority = 5;
        return priority;
    }

    static fromDecleration() {
        let text = tokenIter.value();
        tokenIter.iter();
        virtualIdx += 2;
        return new OperatorObject(text);
    }
}

class ExpressionObject {
    constructor(expectedType = null, defaultType = null) {
        if (defaultType) {
            this.items = [new ExpressionItemObject(defaultType)];
            this.operators = [];
            this.tokenLine = virtualLine;
            this.length = 1;
            this.operators.push(new OperatorObject(";"));
        } else {
            this.items = [];
            this.operators = [];
            this.tokenLine = virtualLine;
            this.length = 0;
            
            while (true) {
                console.log("expr item: " + tokenIter.value());
    
                this.items.push(new ExpressionItemObject());
                this.length += this.items[this.items.length - 1].length;
    
                console.log("after item: " + tokenIter.value());
                
                if (!isTokenOperator(tokenIter.value())) {
                    break;
                }
    
                virtualIdx++;
    
                this.operators.push(OperatorObject.fromDecleration());
                this.length += 3;
            }
    
            this.operators.push(new OperatorObject(";"));
    
            if (expectedType) {
                this.expectedType = expectedType;
            }
        }
    }

    pushTokens() {
        this.items[0].pushTokens();

        for (let i = 1; i < this.items.length; i++) {
            pushSpace();
            pushToken(this.operators[i - 1].text, Theme.OperatorColor, true);
            this.items[i].pushTokens();
        }
    }

    async collapse() {

        let oprStack = [];
        let curOpr;
        let i = 0;

        await this.items[0].collapse(); // 7;

        while (true) {
            while (oprStack.length && this.operators[i].priority <= oprStack[oprStack.length - 1].priority) {
                curOpr = oprStack.pop();
                virtualIdx -= 5;
                await popMergeOpr(virtualIdx, curOpr, false);
                virtualIdx++;
            }

            if (this.operators[i].priority == -1) break;

            if (this.operators[i].text == "&&" && !varStack[varStack.length - 1].value || this.operators[i].text == "||" && varStack[varStack.length - 1].value) {
                let mergeLength = 1;
                let savedIdx = i;
                while (this.operators[i].priority >= this.operators[savedIdx].priority) {
                    i++;
                    mergeLength += 3 + this.items[i].length;
                }

                let value;
                if (this.operators[savedIdx].text == "&&") value = false;
                else value = true;

                await mergeTokens(virtualLine, virtualIdx, mergeLength, new TypeObject("bool"), value);
                varStack.pop();
                pushTempVar(new TypeObject("bool"), value);

                if (this.operators[i].priority == -1) break;
            }

            virtualIdx += 3;
            oprStack.push(this.operators[i]);
            i++;

            await this.items[i].collapse();
        }

        const resultVar = varStack[varStack.length - 1];

        const typeCastingPriorities = ['char', 'int', 'double', 'bool', 'string'];

        if (this.expectedType && this.expectedType.type != "array" && resultVar.type.type != "null" && typeCastingPriorities.indexOf(resultVar.type.type) < typeCastingPriorities.indexOf(this.expectedType.type)) {
            const newValue = typeCast(varStack.pop().value, resultVar.type, this.expectedType);
            pushTempVar(this.expectedType, newValue);
            virtualIdx--;
            await mergeTokens(virtualLine, virtualIdx, 1, this.expectedType, newValue);
            virtualIdx++;
        }
    }
}

class InnerOperatorObject {
    constructor() {
        if (tokenIter.value() == "[") {
            this.type = "index";
            tokenIter.iter();
            virtualIdx++;
            this.indexExpressions = [];
            while (true) {
                this.indexExpressions.push(new ExpressionObject());
                if (tokenIter.value() == "]") break;
                tokenIter.iter();
                virtualIdx += 2;
            }
            tokenIter.iter();
            virtualIdx++;
        } else if (tokenIter.value() == ".") {
            tokenIter.iter();
            virtualIdx++;
            tokenIter.iter();
            if (tokenIter.value() == "(") {
                tokenIter.iter(-1);
                this.type = "function";
            } else {
                tokenIter.iter(-1);
                this.type = "var";
                this.varName = tokenIter.value();
                tokenIter.iter();
                virtualIdx++;
            }
        }
    }
}

class ExpressionItemObject {
    constructor(defaultType = false) {
        this.innerOperators = [];

        if (defaultType) {
            this.length = 1;
            if (defaultType.type == "string" || defaultType.type == "array") {
                this.type = "null";
                this.value = null;
            } else if (defaultType.type == "int" || defaultType.type == "double") {
                this.type = defaultType.type;
                this.value = 0;
            } else if (defaultType.type == "char") {
                this.type = "char";
                this.value = '\0';
            } else if (defaultType.type == "bool") {
                this.type = "bool";
                this.value = false;
            }
        } else {
            let isNegativeNumber = false;
            if (tokenIter.value() == "-") {
                isNegativeNumber = true;
                tokenIter.iter();
                virtualIdx++;
            }
    
            this.length = 1;
    
            if (!isNaN(tokenIter.value())) {
                let value = tokenIter.value();
                tokenIter.iter();
                virtualIdx++;
    
                if (tokenIter.value() == ".") {
                    this.type = "double";
                    tokenIter.iter();
                    virtualIdx++;
                    let pointValue = tokenIter.value();
                    tokenIter.iter();
                    virtualIdx++;
                    this.value = parseFloat("" + value + "." + pointValue);
                } else {
                    this.type = "int";
                    this.value = parseInt(value);
                }
    
                if (isNegativeNumber) {
                    this.value = -this.value;
                }
                this.length = 1;
            } else if (isNegativeNumber) {
                // Is Negative, but not a number, meaning this is the numeral negation operator.
                this.type = "numNegationOperator";
                this.value = new ExpressionItemObject();
                this.length = 1;
            } else if (tokenIter.value() == "null") {
                this.type = "null";
                this.value = null;
                tokenIter.iter();
                virtualIdx++;
                this.length = 1;
            } else if (tokenIter.value() == "new" || tokenIter.value() == "{") {
                this.type = "newArray";
                const savedTokenIdx = virtualIdx;
                if (tokenIter.value() == "new") {
                    this.usesArrayTypeContext = false;
                    tokenIter.iter();
                    virtualIdx += 2;
                    const arrayBaseType = tokenIter.value();
                    let arrayDimentions = 1;
                    tokenIter.iter(2);
                    virtualIdx += 2;
                    if (tokenIter.value() != "]" && tokenIter.value() != ",") {
                        this.arrayLengthExpressions = [];
                        while (true) {
                            const curExpr = new ExpressionObject(new TypeObject("int"))
                            this.arrayLengthExpressions.push(curExpr);
                            if (tokenIter.value() == "]") break;
                            tokenIter.iter();
                            virtualIdx += 2;
                            arrayDimentions++;
                        }
                    } else {
                        while (tokenIter.value() == ",") {
                            tokenIter.iter();
                            virtualIdx++;
                            arrayDimentions++;
                        }
                    }
                    tokenIter.iter();
                    virtualIdx++;

                    this.typeObj = new TypeObject("array", TypeObject.arrayHelperFunction(arrayBaseType), arrayDimentions);
                    virtualIdx++;
                } else {
                    this.usesArrayTypeContext = true;
                    this.typeObj = curArrayContextType;
                }
                
                if (tokenIter.value() == "{") {
                    this.arrayValueExpressions = ExpressionItemObject.buildNewArrayHelperFunction();
                }

                this.length = virtualIdx - savedTokenIdx;
            } else if (isTokenType(tokenIter.value())) {
                this.type = "type";
                this.value = TypeObject.fromDecleration();
                this.length = this.value.length;
            } else if (tokenIter.value() == "(") {
                tokenIter.iter();
                this.type = "expression";
                let savedIdx = virtualIdx;
                virtualIdx++;
                this.value = new ExpressionObject();
                tokenIter.iter();
                virtualIdx++;
                this.length = virtualIdx - savedIdx;
    
                if (this.value.items[0].type == "type") {
                    console.log("type casting");
                    this.type = "typeCasting";
                    this.newType = this.value.items[0].value;
                    this.value = new ExpressionItemObject();
                    this.length += this.value.length;
                }
            } else if (tokenIter.value() == "\'") {
                this.type = "char";
                tokenIter.iter();
                this.value = tokenIter.value();
                tokenIter.iter(2);
                virtualIdx += 3;
                this.length = 1;
            } else if (tokenIter.value() == "\"") {
                this.type = "string";
                tokenIter.iter();
                this.value = tokenIter.value();
                tokenIter.iter(2);
                virtualIdx += 3;
                this.length = 1;
            } else if (tokenIter.value() == "true" || tokenIter.value() == "false") {
                this.type = "bool";
                this.value = tokenIter.value() == "true";
                tokenIter.iter();
                virtualIdx++;
                this.length = 1;
            } else if (tokenIter.value() == "!") {
                this.type = "negationOperator";
                tokenIter.iter();
                virtualIdx++;
                this.value = new ExpressionItemObject(virtualIdx);
            } else {
                tokenIter.iter();
                if (tokenIter.value() == "(") {
                    tokenIter.iter(-1);
                    this.type = "function";
                    this.value = tokenIter.value();
                    tokenIter.iter();
                    virtualIdx++;
                    this.givenArgsExpressions = buildGivenArgsExpressions();
                    this.length = 3;
                    if (this.givenArgsExpressions.length > 0) {
                        this.length = 1;
                        for (const expr of this.givenArgsExpressions) {
                            this.length += expr.length + 2;
                        }
                    }
                } else {
                    tokenIter.iter(-1);
                    this.type = "var";
                    this.value = tokenIter.value();
                    tokenIter.iter();
                    virtualIdx++;
                    this.length = 1;
                }
            }

            while (isTokenInnerOperator(tokenIter.value())) {
                this.innerOperators.push(new InnerOperatorObject());
            }
        }
    }

    static buildNewArrayHelperFunction() { // { 123, 1, 1 }
        if (tokenIter.value() == "{") {
            const valueExpressions = [];
            tokenIter.iter();
            virtualIdx += 2;
            if (tokenIter.value() == "}") {
                tokenIter.iter();
                virtualIdx++;
                return valueExpressions;
            }

            while (true) {
                const item = ExpressionItemObject.buildNewArrayHelperFunction();
                valueExpressions.push(item);
                if (tokenIter.value() == "}") {
                    tokenIter.iter();
                    virtualIdx += 2;
                    break;
                }
                tokenIter.iter();
                virtualIdx += 2;
            }

            return valueExpressions;
        }

        return new ExpressionObject();
    }

    static pushTokensArrayHelperFunction(valueExpressions) {
        if (!Array.isArray(valueExpressions)) {
            valueExpressions.pushTokens();
            return;
        }
        pushToken("{", Theme.OperatorColor, false);
        if (valueExpressions.length > 0) {
            pushSpace();
            ExpressionItemObject.pushTokensArrayHelperFunction(valueExpressions[0]);
        }
        for (let i = 1; i < valueExpressions.length; i++) {
            pushToken(",", Theme.OperatorColor, true);
            ExpressionItemObject.pushTokensArrayHelperFunction(valueExpressions[i]);
        }
        pushSpace();
        pushToken("}", Theme.OperatorColor, false);
    }

    pushTokens() {
        if (this.type == "expression") {
            pushToken("(", Theme.OperatorColor, false);
            this.value.pushTokens();
            pushToken(")", Theme.OperatorColor, false);
        } else if (isTokenType(this.type)) {
            pushValueToken(this.value, new TypeObject(this.type));
        } else if (this.type == "var") {
            pushToken("" + this.value, Theme.VarColor, false);
        } else if (this.type == "function") {
            pushToken(this.value, Theme.FunctionColor, false);
            pushToken("(", Theme.OperatorColor, false);
            for (let i = 0; i < this.givenArgsExpressions.length; i++) {
                this.givenArgsExpressions[i].pushTokens();
                if (i < this.givenArgsExpressions.length - 1) {
                    pushToken(",", Theme.OperatorColor, true);
                }
            }
            pushToken(")", Theme.OperatorColor, false);
        } else if (this.type == "negationOperator") {
            pushToken("!", Theme.OperatorColor, false);
            this.value.pushTokens();
        } else if (this.type == "numNegationOperator") {
            pushToken("-", Theme.OperatorColor, false);
            this.value.pushTokens();
        } else if (this.type == "typeCasting") {
            pushToken("(", Theme.OperatorColor, false);
            this.newType.pushTokens();
            pushToken(")", Theme.OperatorColor, false);
            this.value.pushTokens();
        } else if (this.type == "newArray") {
            this.bracketColorIdx = bracketColorCycler;
            if (!this.usesArrayTypeContext) {
                pushToken("new", Theme.KeywordColor, true);
                let htmlTokens = [];
                this.typeObj.pushArrayBaseType(htmlTokens);
                pushHTMLToken(htmlTokens[0]);
                pushToken("[", Theme.OperatorColor, false);
                if (this.arrayLengthExpressions) {
                    this.arrayLengthExpressions[0].pushTokens();
                    for (let i = 1; i < this.arrayLengthExpressions.length; i++) {
                        pushToken(",", Theme.OperatorColor, true);
                        this.arrayLengthExpressions[i].pushTokens();
                    }
                } else {
                    for (let i = 0; i < this.typeObj.arrayDimentions - 1; i++) {
                        pushToken(",", Theme.OperatorColor, false);
                    }
                }
                pushToken("]", Theme.OperatorColor, false);
                htmlTokens = [];
                this.typeObj.arrayType.getHTMLTokensArrayHelperFunction(htmlTokens);
                for (const htmlToken of htmlTokens) {
                    pushHTMLToken(htmlToken);
                }
            }
            if (this.arrayValueExpressions) {
                if (!this.usesArrayTypeContext) {
                    pushSpace();
                }
                ExpressionItemObject.pushTokensArrayHelperFunction(this.arrayValueExpressions);
            }
        }
        
        for (const innerOperator of this.innerOperators) {
            if (innerOperator.type == "index") {
                pushToken("[", Theme.OperatorColor, false);
                innerOperator.indexExpressions[0].pushTokens();
                for (let i = 1; i < innerOperator.indexExpressions.length; i++) {
                    pushToken(",", Theme.OperatorColor, true);
                    innerOperator.indexExpressions[i].pushTokens();
                }
                pushToken("]", Theme.OperatorColor, false);
            } else if (innerOperator.type == "var") {
                pushToken(".", Theme.OperatorColor, false);
                pushToken("Length", Theme.VarColor, false);
            }
        }
    }

    async collapse(getReference = false) {
        let curVarObj;
        const savedTokenIdx = virtualIdx;

        if (this.type == "expression") {
            virtualIdx++;
            await this.value.collapse();
            virtualIdx -= 2;
            await mergeTokens(virtualLine, virtualIdx, 3, varStack[varStack.length - 1].type, varStack[varStack.length - 1].value);
            virtualIdx++;
        } else if (isTokenType(this.type)) {
            pushTempVar(new TypeObject(this.type), this.value);
            virtualIdx++;
        } else if (this.type == "var") {
            curVarObj = varStack.find(varObj => varObj.name === this.value);
            virtualIdx++;
        } else if (this.type == "function") {
            let savedIdx = virtualIdx;
            virtualIdx += 2;
            for await (let givenArg of this.givenArgsExpressions) {
                await givenArg.collapse();
                virtualIdx += 2;
            }

            if (this.givenArgsExpressions.length > 0) {
                virtualIdx--;
            } else {
                virtualIdx++;
            }

            await callFunction(this.value, savedIdx, virtualIdx - savedIdx, this.givenArgsExpressions.length);
            virtualIdx = savedIdx + 1;
            varStack.push(returnVar);
        } else if (this.type == "negationOperator") {
            virtualIdx++;
            await this.value.collapse();
            virtualIdx -= 2;
            await popMergeOpr(virtualIdx, new OperatorObject("!"), true);
            virtualIdx++;
        } else if (this.type == "numNegationOperator") {
            virtualIdx++;
            await this.value.collapse(virtualIdx);
            virtualIdx -= 2;
            await popMergeOpr(tokenIdx, new OperatorObject("-"), true);
            virtualIdx++;
        } else if (this.type == "typeCasting") {
            virtualIdx += this.newType.length + 2;
            await this.value.collapse();
            virtualIdx -= this.newType.length + 3;
            const varObj = varStack.pop();
            const newValue = typeCast(varObj.value, varObj.type, this.newType);
            pushTempVar(this.newType, newValue);
            await mergeTokens(virtualLine, virtualIdx, this.newType.length + 3, this.newType, newValue);
            virtualIdx++;
        } else if (this.type == "newArray") {
            let arrayDimentionsLength = [];
            if (!this.usesArrayTypeContext) {
                virtualIdx += 4;
                if (this.arrayLengthExpressions) {
                    for (let i = 0; i < this.arrayLengthExpressions.length; i++) {
                        await this.arrayLengthExpressions[i].collapse();
                        virtualIdx += 2;
                        arrayDimentionsLength.push(varStack.pop().value);
                    }
                    virtualIdx--;
                } else {
                    virtualIdx += this.typeObj.arrayDimentions;
                }
                virtualIdx += this.typeObj.arrayType.length - 1;
            }
            const savedColorIdx = bracketColorCycler;
            bracketColorCycler = this.bracketColorIdx;
            if (this.arrayValueExpressions) {
                if (!this.usesArrayTypeContext) {
                    virtualIdx++;
                }
                const arrayValue = await ExpressionItemObject.collapseArrayHelperFunction(this.arrayValueExpressions);
                const arrRefValue = arrHeap.length;
                arrHeap.push(arrayValue);
                pushTempVar(this.typeObj, arrRefValue);
                await mergeTokens(virtualLine, savedTokenIdx, virtualIdx - savedTokenIdx, this.typeObj, arrRefValue);
                virtualIdx = savedTokenIdx + 1;
            } else {
                const arrayValue = ExpressionItemObject.buildDefaultArrayValue(this.typeObj.arrayType, arrayDimentionsLength);
                const arrRefValue = arrHeap.length;
                arrHeap.push(arrayValue);
                pushTempVar(this.typeObj, arrRefValue);
                await mergeTokens(virtualLine, savedTokenIdx, virtualIdx - savedTokenIdx, this.typeObj, arrRefValue);
                virtualIdx = savedTokenIdx + 1;
            }
            bracketColorCycler = savedColorIdx;
        }

        if (this.type != "var" && this.innerOperators.length > 0) {
            curVarObj = varStack.pop();
        }

        if (this.type == "var" && !getReference && this.innerOperators.length == 0) {
            pushTempVar(curVarObj.type, curVarObj.value);
            virtualIdx--;
            await mergeTokens(virtualLine, virtualIdx, 1, curVarObj.type, curVarObj.value);
            virtualIdx++;
        }

        const indexes = [];

        if (this.innerOperators.length > 0) {
            let curTypeObj = curVarObj.type;
            let curValueObj = curVarObj.value;
            let curValueParentObj = curValueObj;
            let curValueParentIndex = -1;
    
            for (const innerOperator of this.innerOperators) {
                if (innerOperator.type == "index") {
                    const curIndex = [];
                    virtualIdx++;
                    if (curTypeObj.type == "array") {
                        curTypeObj = deepClone(curTypeObj.arrayType);
                        curValueParentObj = curValueObj;
                        curValueObj = arrHeap[curValueObj];
                    } else if (curTypeObj.type == "string") {
                        curTypeObj = new TypeObject("char");
                    }
                    for (let i = 0; i < innerOperator.indexExpressions.length; i++) {
                        await innerOperator.indexExpressions[i].collapse();
                        virtualIdx += 2;
                        const index = varStack.pop().value;
                        curValueParentObj = curValueObj;
                        curValueParentIndex = index;
                        curValueObj = curValueObj[index];
                        curIndex.push(index);
                    }
                    indexes.push(curIndex);
                    virtualIdx--;
                } else if (innerOperator.type == "var") {
                    curTypeObj = new TypeObject("int");
                    curValueObj = arrHeap[curValueObj].length;
                    virtualIdx += 2;
                }
            }

            if (getReference) {
                return [curVarObj, curValueParentObj, curValueParentIndex, curTypeObj, curValueObj];
            }

            pushTempVar(curTypeObj, curValueObj);

            await mergeTokens(virtualLine, savedTokenIdx, virtualIdx - savedTokenIdx, curTypeObj, curValueObj);
        }

        if (getReference) {
            return [curVarObj, null, -1, curVarObj.type, curVarObj.value];
        }

        virtualIdx = savedTokenIdx + 1;
    }

    static buildDefaultArrayValue(arrayType, arrayDimentionsLength) {        
        if (arrayDimentionsLength.length <= 0) {
            return getDefaultValue(arrayType);
        }
        
        const length = arrayDimentionsLength.splice(0, 1)[0];
        return Array(length).fill(ExpressionItemObject.buildDefaultArrayValue(arrayType, arrayDimentionsLength));
    }

    static async collapseArrayHelperFunction(arrayValueExpressions) {
        if (!Array.isArray(arrayValueExpressions)) {
            await arrayValueExpressions.collapse();
            return varStack.pop().value;
        }
        const arrayValue = [];
        virtualIdx++;
        if (arrayValueExpressions.length > 0) {
            virtualIdx++;
            arrayValue.push(await ExpressionItemObject.collapseArrayHelperFunction(arrayValueExpressions[0]));
        }
        for (let i = 1; i < arrayValueExpressions.length; i++) {
            virtualIdx += 2;
            arrayValue.push(await ExpressionItemObject.collapseArrayHelperFunction(arrayValueExpressions[i]));
        }
        virtualIdx += 2;
        return arrayValue;
    }
}

let tokens = [];
let tokenIter = null;

let funcMap = new Map();
let varStack = [];

let tokenLines = null;
let tabsOffset = 0;
let virtualLine = -1;
let virtualIdx = 0;
let lineBaseOffset = 0;
let shouldContinueLoop = false;
let shouldBreakLoop = false;
let shouldReturnFunction = false;
let returnVar;
let returnVarLine;
let bracketColorCycler = 0;
let curVarCreationType = null;
let curVarCreationIndex = 0;
let arraysContextTypesStack = [];

let curFunc;

let tempVarCounter = 0;

let controller = null;
let signal = null;
let resolveStep = null;
let timerActive = false;
let timerInterval = null;

let savedStacks = [];

let arrHeap = [];

const DELAY_MS = 750;

function buildGivenArgsExpressions() {
    let argsExpressions = [];
    tokenIter.iter(); // Skip the token "("
    virtualIdx++;
    while (tokenIter.value() != ")") {
        argsExpressions.push(new ExpressionObject());

         // If the token "," was found, skip it. Now pointing to the next arg's type
        if (tokenIter.value() == ",") {
            tokenIter.iter();
            virtualIdx += 2;
        }
    }
    tokenIter.iter();
    virtualIdx++;

    return argsExpressions;
}

async function waitUntilStep() {
    return new Promise(resolve => resolveStep = resolve);
}

async function callFunction(funcName, tokenIdx, length, givenArgsLength) {
    let savedArgs = [];

    if (givenArgsLength > 0) {
        savedArgs = varStack.splice(-givenArgsLength);
    }

    savedStacks.push(varStack);
    varStack = savedArgs;

    let func = funcMap.get(funcName);
    let prevVirtualLine = virtualLine;
    let prevTabOffset = tabsOffset;
    lineBaseOffset += curFunc.height;
    
    const savedScrollTop = UI.tokenContainerContainer.scrollTop;

    await func.interpret();
    varStack = savedStacks.pop();

    setCurLine(returnVarLine);

    lineBaseOffset -= curFunc.height;
    virtualLine = prevVirtualLine;
    tabsOffset = prevTabOffset;
    
    if (func.funcType.type != "void") {
        await mergeTokens(virtualLine, tokenIdx, length, returnVar.type, returnVar.value);
    }

    UI.tokenContainerContainer.scrollTo({
        top: savedScrollTop,
        behavior: "smooth"
    });

    const tokenLinesToRemove = Array.from(tokenLines).slice(lineBaseOffset + curFunc.height, lineBaseOffset + curFunc.height + func.height + 1);
    tokenLinesToRemove.forEach(tokenLine => {
        const tokens = Array.from(tokenLine.children);
        tokens.forEach(token => token.classList.add("fade-out"));
        tokenLine.classList.add("line-fade-out");
    });
    await delay(400);
    tokenLinesToRemove.forEach(tokenLine => tokenLine.remove());
    
    await waitUntilStep();
}

function deepClone(obj) {
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
  
    const clone = Object.create(Object.getPrototypeOf(obj));
    for (const key of Reflect.ownKeys(obj)) {
      clone[key] = deepClone(obj[key]);
    }
    return clone;
}

async function pushTempVar(type, value) {
    let tempVar = new VariableObject(deepClone(type), "!^@$%^<temp>" + tempVarCounter, value, virtualLine + lineBaseOffset);
    tempVarCounter++;
    varStack.push(tempVar);
}

function retrieveTokens(code) {
    let curToken = "";
    let curText = "";
    let inString = false;
    let inChar = false;
    let inComment = false;
    let inLongComment = false;
    let inLineComment = false;
    let newLineStarted = false;
    
    tokens = [];

    // code = code.replace(/[\t\r\f\v]+/g, '');

    code = code
    .split("\n")
    .map(line => line.replace(/^[ \t]+$/, "")) // Replace lines with only spaces/tabs with an empty string
    .join("\n");

    // Tokenize the code
    for (let i = 0; i < code.length; i++) {
        if (code[i] == '\n') {
            if (inComment) {
                tokens.push(inLineComment ? "//inLine" : "//");
                tokens.push(curToken);
                curToken = "";
                inComment = false;
            }
            newLineStarted = true;
            if (code[i + 1] == "\n") {
                tokens.push("\n");
            }
            continue;
        }
        if (inComment) {
            curToken += code[i];
            continue;
        }
        if (!inString && !inChar && code[i] == "/" && code[i + 1] == "/") {
            if (curToken) tokens.push(curToken);
            inLineComment = !newLineStarted;
            inComment = true;
            curToken = "";
            i++;
            continue;
        }
        if (!inString && !inChar && (code[i] == "\"" || code[i] == "\'")) {
            if (code[i] == "\"") inString = true;
            else inChar = true;
            tokens.push(code[i]);
            curText = "";
            continue;
        }
        if (inString || inChar) {
            if (inString && code[i] == "\"" || inChar && code[i] == "\'") {
                if (inString) inString = false;
                else inChar = false;
                tokens.push(curText);
                tokens.push(code[i]);
                curText = "";
                continue;
            }

            let newChar = code[i];

            if (code[i] == '\\') {
                i++;
                switch (code[i]) {
                    case '\\': {
                        newChar = '\\';
                        break;
                    } case 'n': {
                        newChar = '\n';
                        break;
                    } case 'r': {
                        newChar = '\r';
                        break;
                    } case 't': {
                        newChar = '\t';
                        break;
                    } case 'b': {
                        newChar = '\b';
                        break;
                    } case 'f': {
                        newChar = '\f';
                        break;
                    } case 'v': {
                        newChar = '\f';
                        break;
                    } case '\'': {
                        newChar = '\'';
                        break;
                    } case '\"': {
                        newChar = '\"';
                        break;
                    } case '\0': {
                        newChar = '\0';
                        break;
                    }
                }
            }

            curText += newChar;
        }
        else if (isCharIdentifier(code[i])) {
            newLineStarted = false;
            curToken += code[i];
        } else {
            if (curToken) tokens.push(curToken);
            curToken = "";
            if (code[i].trim()) {
                tokens.push(code[i]);
                newLineStarted = false;
            }
        }
    }

    // Merge together operator's characters to a single token, eg: "+", "+" => "++", "!", "=" => "!="
    for (let i = 0; i < tokens.length - 1; i++)
    {
        if (tokens[i] == tokens[i + 1] && (tokens[i] == "+" || tokens[i] == "-" || tokens[i] == "&" || tokens[i + 1] == "|") || (tokens[i + 1] == "=" && (tokens[i] == "+" || tokens[i] == "-" || tokens[i] == "*" || tokens[i] == "/" || tokens[i] == "%" || tokens[i] == ">" || tokens[i] == "<" || tokens[i] == "!" || tokens[i] == "=")))
        {
            tokens[i] += tokens[i + 1];
            tokens.splice(i + 1, 1);
        }
    }

    for (const token of tokens) {
        console.log("token: " + token);
    }
}

function isCharIdentifier(ch) {
    return ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || ch == '_';
}

function isTokenType(token) {
    return token == "int" || token == "double" || token == "bool" || token == "char" || token == "string" || token == "null";
}

function isTokenOperator(token) {
    return token == "||" || token == "&&" || token == "==" || token == "!=" || token == ">" || token == ">=" || token == "<" || token == "<=" || token == "<" || token == "<="  || token == "*" || token == "/"
    || token == "+" || token == "-" || token == "%";
}

function isTokenInnerOperator(token) {
    return token == "[" || token == ".";
}

function formatDoubleNumber(num) {
    let decimalPlaces = Math.max(1, Math.min(5, num.toString().split(".")[1]?.length || 0));
    return num.toFixed(decimalPlaces);
}

function typeCast(value, oldType, newType) {
    console.log("type casting from " + oldType.type + " to " + newType.type);
    if (newType.type == "char") {
        return String.fromCharCode(value)[0];
    }
    if (newType.type == "string") {
        if (oldType.type == "double") {
            return formatDoubleNumber(value);
        }
        return "" + value;
    }
    if (newType.type == "int") {
        if (oldType.type == "char") {
            return value.charCodeAt(0);
        }
        return Math.trunc(value);
    }
    if (newType.type == "double") {
        if (oldType.type == "char") {
            return value.charCodeAt(0);
        }
    }

    return value;
}

function getDefaultValue(type) {
    if (type.type == "array" || type.type == "string") return null;
    if (type.type == "int" || type.type == "double") return 0;
    if (type.type == "char") return '\0';
    if (type.type == "bool") return false;
}

async function iterVirtualLine() {
    virtualLine++;
    virtualIdx = 1;
}

async function newLine() {
    virtualLine++;

    let newLine = document.createElement("div");
    let lineNumSpan = document.createElement("h4");
    let pre = document.createElement("pre");
    pre.className = "token";
    pre.textContent = "";
    pre.style.color = Theme.LineNumberColor;

    let lineNumberStr = lineBaseOffset + virtualLine + 1 + "";

    for (let i = 0; i < 3 - lineNumberStr.length; i++) {
        pre.textContent += " ";
    }
    pre.textContent += lineNumberStr + "   ";

    if (tabsOffset > 0) virtualIdx = 1;
    else virtualIdx = 1;

    for (let i = 0; i < tabsOffset; i++) {
        pre.textContent += " ";
    }

    newLine.appendChild(pre);
    newLine.className = "token-line";

    if (lineBaseOffset + virtualLine == tokenLines.length) {
        UI.tokenContainer.appendChild(newLine);
    } else {
        UI.tokenContainer.insertBefore(newLine, tokenLines[lineBaseOffset + virtualLine]);
    }
}


function pushValueToken(value, type) {
    const newToken = getVarHTML(type, value);
    
    if (virtualIdx == tokenLines[lineBaseOffset + virtualLine].children.length) {
        tokenLines[lineBaseOffset + virtualLine].appendChild(newToken);
    } else {
        tokenLines[lineBaseOffset + virtualLine].insertBefore(newToken, tokenLines[lineBaseOffset + virtualLine].children[virtualIdx]);
    }

    virtualIdx++;
}


function pushHTMLToken(htmlToken) {

    if (virtualIdx == tokenLines[lineBaseOffset + virtualLine].children.length) {
        tokenLines[lineBaseOffset + virtualLine].appendChild(htmlToken);
    } else {
        tokenLines[lineBaseOffset + virtualLine].insertBefore(htmlToken, tokenLines[lineBaseOffset + virtualLine].children[virtualIdx]);
    }

    virtualIdx++;
}

function pushToken(value, color, addSpace) {
    const newToken = getTokenHTML(value, color);
    pushHTMLToken(newToken);
    if (addSpace) {
        pushSpace();
    }
}

async function pushSpace() {
    const spaceToken = document.createElement("h4");
    spaceToken.className = "token fade-in";
    spaceToken.textContent = " ";

    if (virtualIdx == tokenLines[lineBaseOffset + virtualLine].children.length) {
        tokenLines[lineBaseOffset + virtualLine].appendChild(spaceToken);
    } else {
        tokenLines[lineBaseOffset + virtualLine].insertBefore(spaceToken, tokenLines[lineBaseOffset + virtualLine].children[virtualIdx]);
    }

    virtualIdx++;
}

async function setCurLine(index) {
    tokenLines[lineBaseOffset + virtualLine].style.backgroundColor = "transparent";
    virtualLine = index;
    virtualIdx = 1;
    tokenLines[lineBaseOffset + virtualLine].style.backgroundColor = Theme.CurLineColor;
    await waitUntilStep();
}

async function iterCurLine() {
    await setCurLine(virtualLine + 1);
}

function onStepButtonClick()
{
    if (!controller) interpret();
    else if (resolveStep) {
        resolveStep();
        resolveStep = null;
    }
}

function onRefreshButtonClick()
{
    if (controller) {
        controller.abort();
        controller = null;
        resolveStep = null;
    }
    if (timerActive) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerActive = false;
    }
    UI.playPauseButton.innerHTML = "<i class=\"fa-solid fa-play\"></i></i><span class=\"shortcut\">Space</span>";
    interpret();
}

function onPlayPauseButtonClick()
{
    console.log("play / pause: " + timerActive);
    if (!controller) {
        interpret(true);
        return;
    }
    timerActive = !timerActive;
    console.log("play / pause e: " + timerActive);

    if (timerActive) {
        UI.playPauseButton.innerHTML = "<i class=\"fa-solid fa-pause\"></i></i><span class=\"shortcut\">Space</span>";
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (resolveStep) {
                resolveStep();
                resolveStep = null;
                console.log("play / pause e: " + timerActive);
            }
        }, DELAY_MS);
    } else {
        UI.playPauseButton.innerHTML = "<i class=\"fa-solid fa-play\"></i></i><span class=\"shortcut\">Space</span>";
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function interpret(autoPlay = false) {
    if (controller) return;

    socket.emit("compile", window.editor.getValue(), autoPlay);
}

async function offsetTabs(spaces) {
    tabsOffset += spaces;
}

// The token iterator should point to the token "{"
async function skipScope() {
    let scopeDepth = 1;

    tokenIter.iter();
    while (scopeDepth > 0) {
        if (tokenIter.value() == "{") scopeDepth++;
        else if (tokenIter.value() == "}") scopeDepth--;
        tokenIter.iter();
    }
}

async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function popMergeOpr(tokenIdx, opr, isOneItem) {
    const [type, value, length] = await popOperator(opr, tokenIdx, true, isOneItem);
    await mergeTokens(virtualLine, tokenIdx, length, type, value);
}

async function popOperator(opr, tokenIdx, inExpression, isOneItem) {
    let type;
    let value;
    let length;

    let rightVar;
    let leftVar;
    
    if (!isOneItem) {
        rightVar = varStack.pop();
        leftVar = varStack.pop();
        
        console.log(opr.text + " !!!! poping: " + leftVar.type.type + " , " + rightVar.type.type);

        if ((leftVar.type.type == "string") != (rightVar.type.type == "string")) {
            if (leftVar.type.type == "string") {
                rightVar.value = typeCast(rightVar.value, rightVar.type, leftVar.type);
                rightVar.type = leftVar.type;
                await mergeTokens(virtualLine, tokenIdx + 4, 1, leftVar.type, rightVar.value);
            } else {
                leftVar.value = typeCast(leftVar.value, leftVar.type, rightVar.type);
                leftVar.type = rightVar.type;
                await mergeTokens(virtualLine, tokenIdx, 1, rightVar.type, leftVar.value);
            }
        } else {
            const intType = new TypeObject("int");
            if (leftVar.type.type == "char") {
                leftVar.value = typeCast(leftVar.value, leftVar.type, intType);
                leftVar.type = intType;

                if (inExpression)
                    await mergeTokens(virtualLine, tokenIdx, 1, intType, leftVar.value);
            }
            if (rightVar.type.type == "char") {
                rightVar.value = typeCast(rightVar.value, rightVar.type, intType);
                rightVar.type = intType;
                await mergeTokens(virtualLine, tokenIdx + 4, 1, intType, rightVar.value);
            }

            if ((leftVar.type.type == "double") != (rightVar.type.type == "double")) {
                if (leftVar.type.type == "double") {
                    rightVar.value = typeCast(rightVar.value, rightVar.type, leftVar.type);
                    rightVar.type = leftVar.type;
                    await mergeTokens(virtualLine, tokenIdx + 4, 1, leftVar.type, rightVar.value);
                } else {
                    leftVar.value = typeCast(leftVar.value, leftVar.type, rightVar.type);
                    leftVar.type = rightVar.type;

                    if (inExpression)
                        await mergeTokens(virtualLine, tokenIdx, 1, rightVar.type, leftVar.value);
                }
            }                
        }
                    
        // } else {
        //     rightVar.value = typeCast(rightVar.value, rightVar.type, leftVar.type);
        //     rightVar.type = leftVar.type;
        //     await mergeTokens(virtualLine, tokenIdx + 4, 1, leftVar.type, rightVar.value);
        // }
    }

    if (isOneItem) {
        length = 2;
        let varObj = varStack.pop();

        if (opr.text == "!") {
            type = new TypeObject("bool");
            value = !varObj.value;
        } else {
            type = varObj.type;
            value = -varObj.value;
        }
    } else {
        length = 5;

        console.log("opr left type: " + leftVar.type.type + ", right type: " + rightVar.type.type);

        type = leftVar.type;

        switch (opr.text) {
            case "+": {
                value = leftVar.value + rightVar.value;
                break;
            }
            case "-": {
                value = leftVar.value - rightVar.value;
                break;
            }
            case "*": {
                value = leftVar.value * rightVar.value;
                break;
            }
            case "/": {
                value = leftVar.value / rightVar.value;
                break;
            }
            case "%": {
                value = leftVar.value % rightVar.value;
                break;
            }
            case ">": {
                type = new TypeObject("bool");
                value = leftVar.value > rightVar.value;
                break;
            }
            case "<": {
                type = new TypeObject("bool");
                value = leftVar.value < rightVar.value;
                break;
            }
            case ">=": {
                type = new TypeObject("bool");
                value = leftVar.value >= rightVar.value;
                break;
            }
            case "<=": {
                type = new TypeObject("bool");
                value = leftVar.value <= rightVar.value;
                break;
            }
            case "==": {
                type = new TypeObject("bool");
                value = leftVar.value == rightVar.value;
                break;
            }
            case "!=": {
                type = new TypeObject("bool");
                value = leftVar.value != rightVar.value;
                break;
            }
            case "&&": {
                value = leftVar.value && rightVar.value;
                break;
            }
            case "||": {
                value = leftVar.value || rightVar.value;
                break;
            }
        }

        if (type.type == "int") {
            value = Math.trunc(value);
        }
    }
        
        // if (leftVar.type.type == "int" && rightVar.type.type == "int" && (opr.text == "+" || opr.text == "-" || opr.text == "*" || opr.text == "/" || opr.text == "%")) {
        //     type = new TypeObject("int");
        //     value = Math.trunc(value);
        // } else if (leftVar.type.type == "double" && rightVar.type.type == "int" || leftVar.type.type == "int" && rightVar.type.type == "double") {
        //     if (inExpression) {
        //         if (rightVar.type.type == "int") {
        //             await mergeTokens(virtualLine, tokenIdx + 4, 1, leftVar.type, rightVar.value);
        //         } else if (leftVar.type.type == "int") {
        //             await mergeTokens(virtualLine, tokenIdx, 1, rightVar.type, leftVar.value);
        //         }
        //     } else {
        //         await mergeTokens(virtualLine, tokenIdx + 4, 1, leftVar.type, rightVar.value);
        //         console.log("hghgghhghuh????? yues. ypiiptty yues. yes.");
        //     }
        // }

    pushTempVar(type, value);

    return [type, value, length];
}

function getTokenHTML(value, color, addFadeIn = true) {
    const newToken = document.createElement("h4");
    if (addFadeIn) {
        newToken.className = "token fade-in";
    } else {
        newToken.className = "token";
    }
    newToken.textContent = value;

    if (value == ")" || value == "}" || value == "]") {
        bracketColorCycler = (bracketColorCycler + 2) % 3;
        newToken.style.color = Theme.BracketsColors[bracketColorCycler];
    } else if (value == "(" || value == "{" || value == "[") {
        newToken.style.color = Theme.BracketsColors[bracketColorCycler];
        bracketColorCycler = (bracketColorCycler + 1) % 3;
    } else {
        newToken.style.color = color;
    }

    return newToken;
}

function getCharHTML(ch) {
    const newToken = document.createElement("h4");
    newToken.className = "token fade-in";
    
    let color = Theme.SpecialTextColor;
    let innerHTML = "";

    switch (ch) {
        case '\\': {
            innerHTML = '\\\\';
            break;
        } case '\n': {
            innerHTML = '\\n';
            break;
        } case '\r': {
            innerHTML = '\\r';
            break;
        } case '\t': {
            innerHTML = '\\t';
            break;
        } case '\b': {
            innerHTML = '\\b';
            break;
        } case '\f': {
            innerHTML = '\\f';
            break;
        } case '\v': {
            innerHTML = '\\f';
            break;
        } case '\'': {
            innerHTML = '\\\'';
            break;
        } case '\"': {
            innerHTML = '\\\"';
            break;
        } case '\0': {
            innerHTML = '\\0';
            break;
        } default: {
            innerHTML = ch;
            color = Theme.TextColor;
            break;
        }
    }

    newToken.innerHTML = innerHTML;
    newToken.style.color = color;

    return newToken;
}

function getArrayHTMLHelperFunction(htmlTokens, type, value, addFadeIn = true) {
    if (!Array.isArray(value)) {
        htmlTokens.push(getVarHTML(type.arrayType, value, addFadeIn));
        return;
    }
    htmlTokens.push(getTokenHTML("{", Theme.OperatorColor, addFadeIn));
    if (value.length > 0) {
        htmlTokens.push(getTokenHTML(" ", "#000", addFadeIn));
        getArrayHTMLHelperFunction(htmlTokens, type, value[0], addFadeIn);
    }
    for (let i = 1; i < value.length; i++) {
        htmlTokens.push(getTokenHTML(",", Theme.OperatorColor, addFadeIn));
        htmlTokens.push(getTokenHTML(" ", "#000", addFadeIn));
        getArrayHTMLHelperFunction(htmlTokens, type, value[i], addFadeIn);
    }
    htmlTokens.push(getTokenHTML(" ", "#000", addFadeIn));
    htmlTokens.push(getTokenHTML("}", Theme.OperatorColor, addFadeIn));
}

function getVarHTML(type, value, addFadeIn = true) {
    if (value != null && (type.type == "array" || type.type == "string" || type.type == "char")) {
        // Create the new token element.
        let div = document.createElement("div");
        div.style.display = "inline-block";

        if (type.type == "array") {
            const arrValue = arrHeap[value];

            let htmlTokens = [];
            type.pushArrayBaseType(htmlTokens, addFadeIn);
            type.getHTMLTokensArrayHelperFunction(htmlTokens, addFadeIn);
            
            for (const htmlToken of htmlTokens) {
                div.appendChild(htmlToken);
            }

            div.appendChild(getTokenHTML(" ", "#000", addFadeIn));

            htmlTokens = [];
            getArrayHTMLHelperFunction(htmlTokens, type, arrValue, addFadeIn);

            for (const htmlToken of htmlTokens) {
                div.appendChild(htmlToken);
            }

            // 
            // if (arrValue.length > 0) {
            //     div.appendChild(getTokenHTML(" ", "#000"));
            //     div.appendChild(getVarHTML(itemType, arrValue[0]));
            // }
            // for (let i = 1; i < arrValue.length; i++) {
            //     div.appendChild(getTokenHTML(",", Theme.OperatorColor));
            //     div.appendChild(getTokenHTML(" ", "#000"));
            //     div.appendChild(getVarHTML(itemType, arrValue[i]));
            // }
            // div.appendChild(getTokenHTML(" ", "#000"));
            // div.appendChild(getTokenHTML("}", Theme.OperatorColor));
        } else if (type.type == "string") {
            div.appendChild(getTokenHTML("\"", Theme.TextColor, addFadeIn));
            for (const ch of value) {
                div.appendChild(getCharHTML(ch));
            }
            div.appendChild(getTokenHTML("\"", Theme.TextColor, addFadeIn));
        } else if (type.type == "char") {
            div.appendChild(getTokenHTML("\'", Theme.TextColor, addFadeIn));
            div.appendChild(getCharHTML(value));
            div.appendChild(getTokenHTML("\'", Theme.TextColor, addFadeIn));
        }

        return div;
    } else {
        // Create the new token element.
        const newToken = document.createElement("h4");
        if (addFadeIn) {
            newToken.className = "token fade-in";
        } else {
            newToken.className = "token";
        }
        let innerHTML;

        let color = "#FFFFFF";
        
        if (value == null) {
            innerHTML = "null";
            color = Theme.NullColor;
        } else if (type.type == "char") {
            innerHTML = "\'" + value + "\'";
            color = Theme.TextColor;
        } else if (type.type == "string") {
            innerHTML = "\"" + value + "\"";
            color = Theme.TextColor;
        } else if (type.type == "int") {
            innerHTML = "" + value;
            color = Theme.NumberColor;
        } else if (type.type == "double") {
            innerHTML = formatDoubleNumber(value);
            color = Theme.NumberColor;
        } else if (type.type == "bool") {
            innerHTML = "" + value;
            color = Theme.BoolColor;
        }

        newToken.innerHTML = innerHTML;

        newToken.style.color = color;
        return newToken;   
    }
}

// Merge tokens function that merges tokens starting at a given index, over a given length, with a new token value.
async function mergeTokens(line, index, length, type, value) {
    const tokens = Array.from(tokenLines[lineBaseOffset + line].children);

    // Select tokens to merge.
    const tokensToRemove = tokens.slice(index, index + length);
    
    // Apply fade-out to tokens to be merged.
    tokensToRemove.forEach(token => token.classList.add("fade-out"));

    // After the fade-out animation completes, remove old tokens and insert the new token.
    tokensToRemove.forEach(token => token.remove());

    const newToken = getVarHTML(type, value);

    tokenLines[lineBaseOffset + line].insertBefore(newToken, tokenLines[lineBaseOffset + line].children[index]);

    await waitUntilStep();
}

async function updateToken(line, index, type, value) {
    const newToken = getVarHTML(type, value, false);
    const oldToken = tokenLines[lineBaseOffset + line].children[index];

    replaceIfChangedRec(oldToken, newToken);

    tokenLines[lineBaseOffset + line].replaceChild(newToken, tokenLines[lineBaseOffset + line].children[index]);

    await waitUntilStep();
}

function replaceIfChanged(parent, index, newElement) {
    if (parent.children[index].innerHTML == newElement)
    oldElement.replaceChild(newToken, tokenLines[lineBaseOffset + line].children[index]);
}

function replaceIfChangedRec(oldElement, newElement) {
    // First compare the innerHTML of both elements
    if (oldElement.children.length == 0) {
        if (oldElement.innerHTML != newElement.innerHTML) {
            newElement.className = "token fade-in";
        }
        return;
    }

    // If child elements don't match, or either has no children, replace the element
    if (oldElement.children.length !== newElement.children.length) {
        newElement.className = "token fade-in";
        return;
    }

    // Otherwise, recursively compare and replace child elements
    for (let i = 0; i < oldElement.children.length; i++) {
        replaceIfChangedRec(oldElement.children[i], newElement.children[i]);
    }
}

async function removeTokenLines(startIdx, length) {
    const tokenLinesToRemove = Array.from(tokenLines).slice(lineBaseOffset + startIdx, lineBaseOffset + startIdx + length);
    tokenLinesToRemove.forEach(token => token.classList.add("fade-out"));
    tokenLinesToRemove.forEach(tokenLine => tokenLine.remove());
    // await delay(DELAY_MS);
}

async function removeTokens(startIdx, length) {
    const tokensToRemove = Array.from(tokenLines[lineBaseOffset + virtualLine].children).slice(startIdx, startIdx + length);
    tokensToRemove.forEach(token => token.classList.add("fade-out"));
    tokensToRemove.forEach(tokenLine => tokenLine.remove());
}

async function logToUIConsole(text) {
    let pre = UI.console.children[0];
    pre.innerHTML += text;
    UI.consoleContainer.scrollTo({
        top: UI.consoleContainer.scrollHeight,
        behavior: "smooth"
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to add a new prompt line to the console
function addNewPrompt() {
    const line = document.createElement('div');
    line.classList.add('prompt-line');
    // Customize the prompt text as desired, here it's set to "C:\>"
    line.innerHTML = '<span class="prompt">></span><span class="cmd-input" contenteditable="true"></span>';
    UI.console.appendChild(line);
    scrollToBottom();
    const input = line.querySelector('.cmd-input');
    input.focus();
    placeCaretAtEnd(input);
}
// Ensure the latest prompt is in view
function scrollToBottom() {
    UI.console.scrollTop = UI.console.scrollHeight;
}
// Move the caret to the end of the editable span
function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != "undefined"
      && typeof document.createRange != "undefined") {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
// Listen for keydown events to detect when the user presses Enter in the cmd input
document.addEventListener("keydown", (event) => {
    if (document.activeElement.tagName === "TEXTAREA") {
        return;
    }

    if (event.key === "Enter") {
        onStepButtonClick();
    } else if (event.shiftKey && event.key.toUpperCase() === "R") {
        onRefreshButtonClick();
    } else if (event.key === " ") {
        onPlayPauseButtonClick();
    }
});