//------------------------------------二次仪表的处理-------------------------
// 代码安全性检查没有
//处理代码编辑区的TAB键盘按键响应?
//--------------------------------socket.io------------------------------

var socket = io.connect();
var time = 0;
var freq = 0;
var calculateFlowRate = 0;
var actualFlowRate = 0;
var recordInterval = 1;
var recordIntervalCounter = 1;
var warnflag = 0, warnflag2 = 0;
var experimentStatus = 0; //实验状态,0:空闲(停止);1:正在实验;2:正在重置
var errorflag = [0, 0, 0, 0];
const St=0.2;
const D=0.06;
const d=0.014;

setInterval(function () {
    if (experimentStatus != 0) {
        socket.emit('getdata', tableid);
    }
}, 1000);

var weightArray=[];
var timeArray=[];
var actualFlowrate=0;

socket.on("Data Pack", function (temperature, ultraTime, distance, flowRate, totalFlowVortex, weight, flowRateHM, totalFlowHM, temperatureWater,valveIn, valveOut, valveSide, inverter) {
    vortexFlowRate = flowRate;
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
    flowRate = 'xxxx';
    freq = 4*vortexFlowRate*St / (3.14*D*D*d*(1-1.25*d/D));
    var vStr = $('#virtualInstrumentCodeArea').val();
    vStr = vStr.trim();
    if (!vStr) document.getElementById('labelcalculateFlowRate').innerHTML = '';
    else {
        //运行虚拟二次仪表
        try {
            calculateFlowRate = instrumentScript.calculateFlowRate(freq);
            calculateFlowRate=calculateFlowRate.toFixed(3);
            document.getElementById('labelcalculateFlowRate').innerHTML = calculateFlowRate + ' m3/h';
        } catch (e) {
            console.log(e.toString());
            document.getElementById('labelcalculateFlowRate').innerHTML = '运行错误';
        }
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
        //虚拟仪表区,比验证实验多的部分
        document.getElementById('labelfreq').innerHTML = freq.toFixed(2) + ' Hz';
        document.getElementById('labelTotalFlow1').innerHTML = totalFlowHM.toFixed(3) + 'm3';
        document.getElementById('labelFlowRate').innerHTML = actualFlowrate+ ' m3/h';

        //电子秤
        document.getElementById('labelWeight').innerHTML = '质量:' + weight.toFixed(3) + ' kg';
        document.getElementById('labelWeightSide').innerHTML = '质量:' + weight.toFixed(3) + ' kg';
        //涡街流量计
        document.getElementById('labelFlowRateVortex').innerHTML = '瞬时流量:' + calculateFlowRate + ' m3/h';
        document.getElementById('labelFlowRateVortexSide').innerHTML = '瞬时流量:' + calculateFlowRate + ' m3/h';
        document.getElementById('labelTotalFlowVortex').innerHTML = '累积流量:' + totalFlowVortex.toFixed(3) + ' m3';

        document.getElementById("VortexFlowDigit1").src = "/images/LCD/" + parseInt(calculateFlowRate % 10) + ".png";
        document.getElementById("VortexFlowDigit2").src = "/images/LCD/" + parseInt((calculateFlowRate * 10) % 10) + ".png";
        document.getElementById("VortexFlowDigit3").src = "/images/LCD/" + parseInt((calculateFlowRate * 100) % 10) + ".png";
        document.getElementById("VortexFlowDigit4").src = "/images/LCD/" + parseInt((calculateFlowRate * 1000) % 10) + ".png";


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
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        //超声波液位计
        document.getElementById('labelWaterLevel').innerHTML = '液位:' + distance + ' mm';
        document.getElementById('labelWaterLevelSide').innerHTML = '液位:' + distance + ' mm';
        document.getElementById('labelTempAir').innerHTML = '气温:' + temperature.toFixed(3)+ ' C';
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
            chartLevel.series[0].addPoint([time, Number(actualFlowrate)], true, false);
            chartLevel.series[1].addPoint([time, Number(calculateFlowRate)], true, false);

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
                    cell.innerHTML = actualFlowrate;
                    cell.align = "center";

                    cell = row.insertCell(-1);
                    cell.innerHTML = calculateFlowRate;
                    cell.align = "center";

                    document.getElementById("divDataTable").scrollTop = cell.offsetTop;
                }
            } else { recordIntervalCounter = recordInterval; }
        }
    }
});