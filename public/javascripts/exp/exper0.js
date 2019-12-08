//----------------------------------------------------------------socket.IO-----------------
var socket = io.connect();
var time = 0;
var recordInterval = 1;
var recordIntervalCounter = 1;
var experimentStatus = 0; //实验状态,0:空闲(停止);1:正在实验;2:正在重置
var warnflag = 0, warnflag2 = 0;
var errorflag = [0, 0, 0, 0];
var nn = 0;
var mm = 0;
var ss = 0;
setInterval(function () {
    if (experimentStatus != 0) {
        socket.emit('getdata', tableid);
    }
}, 1000);

socket.on("Data Pack", function (temperature, ultraTime, distance, flowRate, totalFlowVortex, weight, flowRateHM, totalFlowHM, temperatureWater, valveIn, valveOut, valveSide, inverter) {
    if (weight !== -1)
        errorflag[0] = 0;
    else if (weight == -1 && errorflag[0] < 80)
        errorflag[0]++;

    if (flowRate !== -1 && totalFlowVortex !== -1)
        errorflag[1] = 0;
    else if ((flowRate == -1 || totalFlowVortex == -1) && errorflag[1] < 80)
        errorflag[1]++;

    if (errorflag[0] == 75)
        WeightError();

    if (errorflag[1] == 75)
        VortexError();

    document.getElementById('labelWeight').innerHTML = '质量:' + weight + ' kg';
    document.getElementById('labelWeightSide').innerHTML = '质量:' + weight + ' kg';

    // 涡街流量计，以及涡街流量计的实时动态显示
    document.getElementById('labelFlowRateVortex').innerHTML = '瞬时流量:' + flowRate + ' m3/h';
    document.getElementById('labelFlowRateVortexSide').innerHTML = '瞬时流量:' + flowRate + ' m3/h';
    document.getElementById('labelTotalFlowVortex').innerHTML = '累积流量:' + totalFlowVortex + ' m3';


    document.getElementById("VortexFlowDigit1").src = "/images/LCD/" + parseInt(flowRate % 10) + ".png";
    document.getElementById("VortexFlowDigit2").src = "/images/LCD/" + parseInt((flowRate * 10) % 10) + ".png";
    document.getElementById("VortexFlowDigit3").src = "/images/LCD/" + parseInt((flowRate * 100) % 10) + ".png";
    document.getElementById("VortexFlowDigit4").src = "/images/LCD/" + parseInt((flowRate * 1000) % 10) + ".png";
    //超声波流量计
    document.getElementById('labelFlowRateHM').innerHTML = '瞬时流量:' + flowRateHM + ' m3/h';
    document.getElementById('labelFlowRateHMSide').innerHTML = '瞬时流量:' + flowRateHM + ' m3/h';
    document.getElementById('labelTotalFlowHM').innerHTML = '累积流量:' + totalFlowHM + ' m3';
    document.getElementById('labelTempHM').innerHTML = '水温:' + temperatureWater + ' C';

    document.getElementById("USFlowDigit1").src = "/images/LCD/" + parseInt(flowRateHM % 10) + ".png";
    document.getElementById("USFlowDigit2").src = "/images/LCD/" + parseInt((flowRateHM * 10) % 10) + ".png";
    document.getElementById("USFlowDigit3").src = "/images/LCD/" + parseInt((flowRateHM * 100) % 10) + ".png";
    document.getElementById("USFlowDigit4").src = "/images/LCD/" + parseInt((flowRateHM * 1000) % 10) + ".png";
  
    document.getElementById("USFlowTempDigit1").src = "/images/LCD/" + parseInt((temperatureWater / 10) % 10) + ".png";
    document.getElementById("USFlowTempDigit2").src = "/images/LCD/" + parseInt((temperatureWater) % 10) + ".png";
    document.getElementById("USFlowTempDigit3").src = "/images/LCD/" + parseInt((temperatureWater * 10) % 10) + ".png";
    document.getElementById("USFlowTempDigit4").src = "/images/LCD/" + parseInt((temperatureWater * 100) % 10) + ".png";
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //超声波液位计
    document.getElementById('labelWaterLevel').innerHTML = '液位:' + distance + ' mm';
    document.getElementById('labelWaterLevelSide').innerHTML = '液位:' + distance + ' mm';
    document.getElementById('labelTempAir').innerHTML = '气温:' + temperature + ' C';
    //  根据接收的阀门状态信息改变按钮的状态，inverter为变频器
    if (sw1Status == 1) {
        setTimeout(function () {
            sw1Status = 0;
        }, 1500);
    }
    if (sw2Status == 1) {
        setTimeout(function () {
            sw2Status = 0;
        }, 1500);
    }
    if (sw3Status == 1) {
        setTimeout(function () {
            sw3Status = 0;
        }, 1500);
    }
    if (sw4Status == 1) {
        setTimeout(function () {
            sw4Status = 0;
        }, 1500);
    }
    if (sw1Status == 0) {   
        if (valveIn == '1') document.getElementById('sw1').checked = false;
        if (valveIn == '0') document.getElementById('sw1').checked = true;
    }
    if (sw2Status == 0) {
        if (valveSide == '1') document.getElementById('sw2').checked = false;
        if (valveSide == '0') document.getElementById('sw2').checked = true;
    }
    if (sw3Status == 0) {
        if (valveOut == '1') document.getElementById('sw3').checked = false;
        if (valveOut == '0') document.getElementById('sw3').checked = true;
    }
    if (sw4Status == 0) {
        if (inverter) document.getElementById('sw4').checked = true;
        if (inverter == '0') document.getElementById('sw4').checked = false;
    }

    if (experimentStatus == 2 && weight < 2 && valveOut == '1') {
        if (warnflag == 0) {
            //experimentStatus = 3; //切换为闲置状态
            document.getElementById("WarningResetFinished").style.visibility = "visible";
            document.getElementById("WarningResetFinished").style.opacity = "0.8";
            document.getElementById("WarningResetFinished").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
            document.getElementById("WarningResetFinished").style.zIndex = "1000";
            recordExpLog('重置实验完成,水箱已放空');
            warnflag = 1;
        }
    }
    //超重提示，水的质量高于24且出水阀状态是关，变频器是开是关无所谓。但有可能出水阀是开，变频器也是开的时候，也超重。
    if ((weight > 24 && valveOut == '1')||(weight > 24 && valveOut == '0' && inverter!=0)) {
        if (warnflag2 == 0) {
            document.getElementById("WarningOverflow").style.visibility = "visible";
            document.getElementById("WarningOverflow").style.opacity = "0.8";
            document.getElementById("WarningOverflow").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
            document.getElementById("WarningOverflow").style.zIndex = "1000";
            recordExpLog('警告:上储水箱溢出,电子秤超重');
            warnflag2 = 1;
        }
    };
    //记录数据只有在刷新曲线过程中才能进行
    if (isDrawingGraph) { //  绘制曲线
        chartWeight.series[0].addPoint([time, Number(weight)], true, false);
        chartFlow.series[0].addPoint([time, Number(flowRate)], true, false);
        chartInverter.series[0].addPoint([time, Number(inverter)], true, false);
        time += 1000;
        var min = parseInt(time / 60000);
        var sec = (time / 1000) % 60;

        //如果正在记录表格,则向表格中添加数据
        if (isRecordingTable) {
            if (recordIntervalCounter < recordInterval) {
                recordIntervalCounter++;
            } else {
                recordIntervalCounter = 1;
                recordingIndex++;
                //添加表格标题行
                console.log('表格记录是否正常:', inverter + weight + flowRate);
                var row = document.getElementById("tableDataRecord").insertRow();
                var cell;
                cell = row.insertCell(-1);
                cell.innerHTML = (((min < 10) ? "0" : "") + min + ":" + ((sec < 10) ? "0" : "") + sec);
                cell.align = "center";

                cell = row.insertCell(-1);
                cell.innerHTML = inverter;
                cell.align = "center";

                cell = row.insertCell(-1);
                cell.innerHTML = weight;
                cell.align = "center";
                cell = row.insertCell(-1);
                cell.innerHTML = flowRate;
                cell.align = "center";
                document.getElementById("divDataTable").scrollTop = cell.offsetTop;
            }
        } else { recordIntervalCounter = recordInterval; }
    }
});

