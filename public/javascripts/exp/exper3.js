//----------------------------------------------------------------socket.IO-----------------

var socket = io.connect();
var time = 0;
var recordInterval = 1;
var recordIntervalCounter = 1;
var experimentStatus = 0; //实验状态,0:空闲(停止);1:正在实验;2:正在重置
var warnflag = 0, warnflag2 = 0;
var errorflag = [0, 0, 0, 0];
setInterval(function () {
    if (experimentStatus != 0) {
        // var reqTime = Date.now();
        socket.emit('getdata', tableid);
    }
}, 1000);
var weightArray=[];
var timeArray=[];
var actualFlowrate=0;
socket.on("Data Pack", function (temperature, ultraTime, distance, flowRate, totalFlowVortex, weight, flowRateHM, totalFlowHM, temperatureWater,valveIn, valveOut, valveSide, inverter) {
    //如果按照传统的最小二乘法计算斜率的话，由于单位是kg和ms 计算误差好大 而且换成m3和h时也不行
    var time_stamp = Date.now();
       weightArray.push(Number(weight));
    timeArray.push(time_stamp);
    if (weightArray.length == 11) {
        weightArray.splice(0, 1);
        timeArray.splice(0, 1);
        // var a1=(weightArray[3] - weightArray[0]) * 3600 / (timeArray[3] - timeArray[0]);
        // var a2=(weightArray[4] - weightArray[1]) * 3600 / (timeArray[4] - timeArray[1]);
        // var a3=(weightArray[5] - weightArray[2]) * 3600 / (timeArray[5] - timeArray[2]);

        // var b1=(weightArray[2] - weightArray[0]) * 3600 / (timeArray[2] - timeArray[0]);
        // var b2=(weightArray[3] - weightArray[1]) * 3600 / (timeArray[3] - timeArray[1]);

        var c1=(weightArray[5] - weightArray[0]) * 3600 / (timeArray[5] - timeArray[0]);
        var c2=(weightArray[6] - weightArray[1]) * 3600 / (timeArray[6] - timeArray[1]);
        var c3=(weightArray[7] - weightArray[2]) * 3600 / (timeArray[7] - timeArray[2]);
        var c4=(weightArray[8] - weightArray[3]) * 3600 / (timeArray[8] - timeArray[3]);
        var c5=(weightArray[9] - weightArray[4]) * 3600 / (timeArray[9] - timeArray[4]);

        actualFlowrate=(c1+c2+c3+c4+c5)/5;
        actualFlowrate=actualFlowrate.toFixed(3);
       
    }
    if (true) {
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
        //电子秤
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
        //document.getElementById("VortexFlowDigit5").src = "/images/LCD/" + parseInt((flowRate*1000)%10) + ".png";


        //超声波流量计
        document.getElementById('labelFlowRateHM').innerHTML = '瞬时流量:' + flowRateHM + ' m3/h';
        document.getElementById('labelFlowRateHMSide').innerHTML = '瞬时流量:' + flowRateHM + ' m3/h';
        document.getElementById('labelTotalFlowHM').innerHTML = '累积流量:' + totalFlowHM + ' m3';
        document.getElementById('labelTempHM').innerHTML = '水温:' + temperatureWater + ' C';

        document.getElementById("USFlowDigit1").src = "/images/LCD/" + parseInt(flowRateHM % 10) + ".png";
        document.getElementById("USFlowDigit2").src = "/images/LCD/" + parseInt((flowRateHM * 10) % 10) + ".png";
        document.getElementById("USFlowDigit3").src = "/images/LCD/" + parseInt((flowRateHM * 100) % 10) + ".png";
        document.getElementById("USFlowDigit4").src = "/images/LCD/" + parseInt((flowRateHM * 1000) % 10) + ".png";
        //document.getElementById("USFlowDigit5").src = "/images/LCD/" + parseInt((flowRateHM*1000)%10) + ".png";

        document.getElementById("USFlowTempDigit1").src = "/images/LCD/" + parseInt((temperatureWater / 10) % 10) + ".png";
        document.getElementById("USFlowTempDigit2").src = "/images/LCD/" + parseInt((temperatureWater) % 10) + ".png";
        document.getElementById("USFlowTempDigit3").src = "/images/LCD/" + parseInt((temperatureWater * 10) % 10) + ".png";
        document.getElementById("USFlowTempDigit4").src = "/images/LCD/" + parseInt((temperatureWater * 100) % 10) + ".png";
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        //超声波液位计
        document.getElementById('labelWaterLevel').innerHTML = '液位:' + distance + ' mm';
        document.getElementById('labelWaterLevelSide').innerHTML = '液位:' + distance + ' mm';
        document.getElementById('labelTempAir').innerHTML = '气温:' + temperature + ' C';
      
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
        //重置仪器终止判断
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

        //超重提示
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
            chartFlow.series[0].addPoint([time, Number(actualFlowrate)], true, false);
            chartFlow.series[1].addPoint([time, Number(flowRate)], true, false);
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
                    console.log('表格记录是否正常:', inverter + actualFlowrate + flowRate);
                    var row = document.getElementById("tableDataRecord").insertRow();
                    var cell;
                   
                    cell = row.insertCell(-1);
                    cell.innerHTML = (((min < 10) ? "0" : "") + min + ":" + ((sec < 10) ? "0" : "") + sec);
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = inverter;
                    cell.align = "center"; 

                    cell = row.insertCell(-1);
                    cell.innerHTML = actualFlowrate;
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = flowRate;
                    cell.align = "center";

                    document.getElementById("divDataTable").scrollTop = cell.offsetTop;
                }
            } else { recordIntervalCounter = recordInterval; }
        }
    }
});