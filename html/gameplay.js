

function start() {
    
    GLOBAL_CONTROL_PANEL = new ControlPanel(null);
    GLOBAL_FLASK_VIEW = new FlaskView(null).setModel(new Flask(null)).buildDom();
    
    let divTable = document.getElementById("divLaboratoryTable");
    divTable.appendChild(GLOBAL_FLASK_VIEW.getOuterDomObject());

    GLOBAL_CONTROL_PANEL.startSimulationTask();
}