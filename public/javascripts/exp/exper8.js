//------------------------------------二次仪表的处理-------------------------
// 代码安全性检查没有
//处理代码编辑区的TAB键盘按键响应?
//--------------------------------socket.io------------------------------
var actualLevel = 0;
var calculatedLevel = 0;
var socket = io.connect();
var time = 0;
var recordInterval = 1;
var recordIntervalCounter = 1;
var warnflag = 0, warnflag2 = 0;
var experimentStatus = 0; //实验状态,0:空闲(停止);1:正在实验;2:正在重置
var errorflag = [0, 0, 0, 0];
setInterval(function () {
    if (experimentStatus != 0) {
        socket.emit('getdata', tableid);
    }
}, 1000);

socket.on("Data Pack", function (temperature, ultraTime, distance, flowRate, totalFlowVortex, weight, flowRateHM, totalFlowHM, temperatureWater,valveIn, valveOut, valveSide, inverter) {
    distance = 'xxxx';
    actualLevel = weight * 10000 / 1244.1;
    var vStr = $('#virtualInstrumentCodeArea').val();
    vStr = vStr.trim();
    if (!vStr) document.getElementById('labelCalculatedLevel').innerHTML = '';
    else {
        //运行虚拟二次仪表
        try {
            calculatedLevel = instrumentScript.calculateLevel(ultraTime, temperature);
            document.getElementById('labelCalculatedLevel').innerHTML = calculatedLevel.toFixed(1) + ' mm';
        } catch (e) {
            console.log(e.toString());
            document.getElementById('labelCalculatedLevel').innerHTML = '运行错误';
        }
    }

    if (true) {

        if (weight !== -1)
            errorflag[0] = 0;
        else if (weight == -1 && errorflag[0] < 80)
            errorflag[0]++;

        if (temperature !== -1 && ultraTime !== -1 && distance !== -1)
            errorflag[2] = 0;
        else if ((temperature == -1 || ultraTime == -1 || distance == -1) && errorflag[2] < 80)
            errorflag[2]++;

        if (errorflag[0] == 75)
            WeightError();
        if (errorflag[2] == 75)
            LevelError();

        //虚拟仪表区,比验证实验多的部分
        document.getElementById('labelDelay1').innerHTML = ultraTime.toFixed(0)+ ' us';
        document.getElementById('labelTemperature1').innerHTML = temperature.toFixed(1) + ' ℃';
        document.getElementById('labelLevel1').innerHTML = actualLevel.toFixed(1) + ' mm';


        //电子秤
        document.getElementById('labelWeight').innerHTML = '质量:' + weight.toFixed(3) + ' kg';
        document.getElementById('labelWeightSide').innerHTML = '质量:' + weight.toFixed(3) + ' kg';
        //涡街流量计
        document.getElementById('labelFlowRateVortex').innerHTML = '瞬时流量:' + flowRate.toFixed(3) + ' m3/h';
        document.getElementById('labelFlowRateVortexSide').innerHTML = '瞬时流量:' + flowRate.toFixed(3) + ' m3/h';
        document.getElementById('labelTotalFlowVortex').innerHTML = '累积流量:' + totalFlowVortex.toFixed(3) + ' m3';

        document.getElementById("VortexFlowDigit1").src = "/images/LCD/" + parseInt(flowRate % 10) + ".png";
        document.getElementById("VortexFlowDigit2").src = "/images/LCD/" + parseInt((flowRate * 10) % 10) + ".png";
        document.getElementById("VortexFlowDigit3").src = "/images/LCD/" + parseInt((flowRate * 100) % 10) + ".png";
        document.getElementById("VortexFlowDigit4").src = "/images/LCD/" + parseInt((flowRate * 1000) % 10) + ".png";


        //超声波流量计
        document.getElementById('labelFlowRateHM').innerHTML = '瞬时流量:' + flowRateHM.toFixed(3) + ' m3/h';
        document.getElementById('labelFlowRateHMSide').innerHTML = '瞬时流量:' + flowRateHM.toFixed(3) + ' m3/h';
        document.getElementById('labelTotalFlowHM').innerHTML = '累积流量:' + totalFlowHM.toFixed(3) + ' m3';
        document.getElementById('labelTempHM').innerHTML = '水温:' + temperatureWater.toFixed(3) + ' C';

        document.getElementById("USFlowDigit1").src = "/images/LCD/" + parseInt(flowRateHM % 10) + ".png";
        document.getElementById("USFlowDigit2").src = "/images/LCD/" + parseInt((flowRateHM * 10) % 10) + ".png";
        document.getElementById("USFlowDigit3").src = "/images/LCD/" + parseInt((flowRateHM * 100) % 10) + ".png";
        document.getElementById("USFlowDigit4").src = "/images/LCD/" + parseInt((flowRateHM * 1000) % 10) + ".png";

        document.getElementById("USFlowTempDigit1").src = "/images/LCD/" + parseInt((temperatureWater / 10) % 10) + ".png";
        document.getElementById("USFlowTempDigit2").src = "/images/LCD/" + parseInt((temperatureWater) % 10) + ".png";
        document.getElementById("USFlowTempDigit3").src = "/images/LCD/" + parseInt((temperatureWater * 10) % 10) + ".png";
        document.getElementById("USFlowTempDigit4").src = "/images/LCD/" + parseInt((temperatureWater * 100) % 10) + ".png";
       

        //超声波液位计
        document.getElementById('labelWaterLevel').innerHTML = '液位:' + calculatedLevel + ' mm';
        document.getElementById('labelWaterLevelSide').innerHTML = '液位:' + calculatedLevel + ' mm';
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
            //experimentStatus = 3; //切换为闲置状态
            //等待10s,确保水放完,然后弹框提示,并关闭下水阀
            if (warnflag == 0) {
                document.getElementById("WarningResetFinished").style.visibility = "visible";
                document.getElementById("WarningResetFinished").style.opacity = "0.8";
                document.getElementById("WarningResetFinished").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
                document.getElementById("WarningResetFinished").style.zIndex = "1000";
                recordExpLog('重置实验完成,水箱已放空');
                warnflag = 1;
            }
        }
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
        if (isDrawingGraph) {
            chartLevel.series[0].addPoint([time, Number(actualLevel)], true, false);
            chartLevel.series[1].addPoint([time, Number(calculatedLevel)], true, false);

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
                    var row = document.getElementById("tableDataRecord").insertRow();
                    var cell;
                    cell = row.insertCell(-1);
                    cell.innerHTML = recordingIndex;
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = (((min < 10) ? "0" : "") + min + ":" + ((sec < 10) ? "0" : "") + sec);
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = actualLevel.toFixed(1);
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = calculatedLevel.toFixed(1);
                    cell.align = "center";

                    document.getElementById("divDataTable").scrollTop = cell.offsetTop;
                }
            } else { recordIntervalCounter = recordInterval; }
        }
    }
});