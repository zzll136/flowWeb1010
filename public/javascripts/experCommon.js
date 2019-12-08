var tableid = 7;
var courseid;
var urlstr = window.location.href;
courseid = urlstr.substring(urlstr.length, urlstr.length - 1);

//即将离开当前页面(刷新或关闭)时执行
window.onbeforeunload = function () {
    return 1;//阻止意外关闭实验页
}

//窗口关闭时,释放桌子
window.onunload = function () {
    recordExpLog('退出实验');
    $.ajax({
        type: 'POST',
        async: false,
        url: '/experiment/tableFree',
        data: 'tableid=' + tableid,
        success: function (data) {
        }
    });
};

//进入实验时，更新频率
window.onload = function () {
    updateFrequencyValue();
    recordExpLog('进入实验');
}

var year;
//开始实验，打开进水阀和变频器
function startExp(){
    if (experimentStatus == 0) //目前是停止实验的状态，现在要开始实验
    {
        var status;
        var expTime = new Date();
        var y = expTime.getFullYear();
        var m = addZero(expTime.getMonth() + 1);
        var d = addZero(expTime.getDate());
        var h = addZero(expTime.getHours());
        var min = addZero(expTime.getMinutes());
        var t = y + "-" + m + "-" + d;
        h = h + ":00";
        if (role == "s") {
            $.post('/experiment/judgeOrder', {
                t: t,
                h: h
            }, function (time) {
                if (time.num == 0) { alert("未预约该时间段" + h + "的实验"); return; }
                else if ((time.doif == 0)||(min > 30 && time.doif == null)) { alert("已迟到30min以上，不能继续做实验"); return; }
                else {
                    year=time.year;
                    $.post('/experiment/courseInfo', { orderYear: time.year }, function (result) {
                        if (result != "none") {
                            for (var i = 0; i < result.length; i++) {
                                if (result[i].courseID == courseid)
                                    status = result[i].status;
                            }
                            switch (status) {
                                case 0:
                                    if (confirm('你即将开始实验，继续请按确认'))
                                        break;
                                    else return;
                                case 1:
                                    if (confirm('您已完成此实验,重做会覆盖之前的实验记录,继续请按确认。'))
                                        break;
                                    else return;
                                case 2:
                                    alert('您已提交报告,不能重新进行此实验');
                                    return;
                            }
                        }
                        $.post('/experiment/tableMatch', {
                            courseid: courseid,
                            min: min,
                            t: t,
                            h: h,
                        }, function (data) {
                            tableid = data;
                            if (tableid == 7) {
                                alert("实验桌临时故障，很抱歉，请重新预约！");
                            }
                            else {
                                experimentStatus = 1; //实验状态设置为已经开始实验
                                //Create_socket();
                                socket.emit('startExperiment', tableid, document.getElementById('frequencySlider').value);
                                // chartWeight.series[0].remove();
                                // chartWeight.addSeries(createEmptySeries());
                                // chartVortex.series[0].remove();
                                // chartVortex.addSeries(createEmptySeries());
                                time = 0;
                                recordExpLog('开始实验');
                                setButtonsByStatus();//按钮的字变成结束实验
                                openCamera(tableid);
                                //buttonSet();
                            }
                        });
                    });
                }
            });
        }
        else if (role == "t") {
            $.post('/experiment/judgeOrder', {
                t: t,
                h: h
            }, function (time) {
                if (time.num == 0)
                    alert("未预约该时间段" + h + "的实验");
                else {
                    $.post('/experiment/tableMatch', {
                        courseid: courseid,
                        min: min,
                        t: t,
                        h: h
                    }, function (data) {
                        tableid = data;
                        if (tableid == 7) {
                            alert("实验桌临时故障，很抱歉，请重新预约！");
                        }
                        else {
                            experimentStatus = 1; //1是运行状态，socket.emit('emitEvent',data),socket.on('emitEvent',function(data){});
                            //Create_socket();
                            socket.emit('startExperiment', tableid, document.getElementById('frequencySlider').value);
                            // chartWeight.series[0].remove();
                            // chartWeight.addSeries(createEmptySeries());
                            // chartVortex.series[0].remove();
                            // chartVortex.addSeries(createEmptySeries());
                            time = 0;
                            recordExpLog('开始实验');
                            setButtonsByStatus();
                            openCamera(tableid);
                            //buttonSet();
                        }
                    });
                }
            });
        }
        else if (role == "m") {
            tableid = document.getElementsByTagName("select")[0].value;
            $.post('/experiment/setstatus', {
                tableid: tableid
            }, function (data) {
                if (!tableid) alert("无可用实验桌");
                else if (data !== "1") {
                    alert("实验桌被占用,请重新选择");
                }
                else {
                    experimentStatus = 1; //1是运行状态，socket.emit('emitEvent',data),socket.on('emitEvent',function(data){});
                    socket.emit('startExperiment', tableid, document.getElementById('frequencySlider').value);
                    time = 0;
                    recordExpLog('开始实验');
                    setButtonsByStatus();
                    openCamera(tableid);
                }
            });
        }
        else if (role == "n") {
            alert("请先登陆");
            return;
        }
    }
    else if (experimentStatus == 1) {  //说明是已经开始实验的状态，现在要结束实验
        if (confirm('是否确认结束实验？')) {
            if (courseid == 6 || courseid == 7 || courseid == 8) {
                $.post('/experiment/codeReset', {
                    codeid: courseid
                }, function (data) { });
            }
            $.post('/experiment/tableFree', {
                tableid: tableid
            }, function (data) { });
            // 将实验状态改为结束实验的状态
            experimentStatus = 0;
            socket.emit('stopExperiment', tableid);
            recordExpLog('结束实验');
            setButtonsByStatus();
            window.location.href = location.href;
        }
        // buttonSet();
    }
    else {
        // 说明此事状态值为2，表示重置后开始实验
        experimentStatus = 1; //1是运行状态，socket.emit('emitEvent',data),socket.on('emitEvent',function(data){});
        document.getElementById('frequencySlider').value = 30;
        socket.emit('startExperiment', tableid, document.getElementById('frequencySlider').value);
        chartReset();
        time = 0;
        recordExpLog('重置后开始实验');
        isDrawingGraph = !isDrawingGraph;
        document.getElementById("buttonPauseGraph").innerText = isDrawingGraph ? "暂停曲线" : "开始曲线";
        setButtonsByStatus();
        //buttonSet();
    }
    //setButtonsByStatus();
}

//重置实验,停止水泵,打开出水阀
function resetExp(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        experimentStatus = 2;//设置为2 表示重置实验
        setButtonsByStatus();
        isDrawingGraph = !isDrawingGraph;
        document.getElementById("buttonPauseGraph").innerText = isDrawingGraph ? "暂停曲线" : "开始曲线";
        socket.emit('resetExperiment', tableid);
        recordExpLog('重置实验');
    }
}

// 清空表格按钮
var recordingIndex = 0;
var cell1=["时间","时间","时间","时间","时间","序号","序号","序号","序号"];
var cell2=["频率","频率","频率","频率","频率","时间","时间","时间","时间"];
var cell3=["质量(kg)","质量(kg)","实际液位","实际流量","实际流量","实际液位","实际流量(m3/h)","实际流量(m3/h)","实际液位(mm)"];
var cell4=["涡街流量(m3/h)","超声波流量(m3/h)","超声波液位(mm)","涡街流量(m3/h)","超声波流量(m3/h)","超声波液位(mm)","计算流量(m3/h)","计算流量(m3/h)","计算液位(mm)"];
function clearTable(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        recordingIndex = 0;
        //清除试验数据的所有内容，jquery的empty函数，清除被选元素的所有内容
        $("#tableDataRecord").empty();
        // 添加表格标题行
        var row = document.getElementById("tableDataRecord").insertRow();
        var cell;
        cell = row.insertCell(-1);
        cell.innerHTML = cell1[courseid];
        cell.align = "center";
        cell.style = "font-weight: bolder";

        cell = row.insertCell(-1);
        cell.innerHTML = cell2[courseid];
        cell.align = "center";
        cell.style = "font-weight: bolder";

        cell = row.insertCell(-1);
        cell.innerHTML = cell3[courseid];
        cell.align = "center";
        cell.style = "font-weight: bolder";

        cell = row.insertCell(-1);
        cell.innerHTML = cell4[courseid];
        cell.align = "center";
        cell.style = "font-weight: bolder";
        recordExpLog('清空表格');
    }
}
$('#buttonClearRecord').click(function (e) {
    clearTable();
});

//提交代码
function submitScript(){
    var urlStr="/experiment/updateScript"+courseid;
    $.ajax({
        type: 'POST',
        async: false,
        url: urlStr,
        data: 'code=' + encodeURIComponent($('#virtualInstrumentCodeArea').val()),
        success: function (data) {
            if (data="received") {
                alert("提交成功");
            } else if(data="error")
            alert("提交失败，上传代码不可包含敏感标签")
        }
    });
    document.getElementById('instrumentScript').contentWindow.location.reload();//重新加载,刷新页面
}

//保存数据
$('#buttonEndExperiment').click(function (e) {
    saveExperdata();
});
function saveExperdata(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        var urlStr="/experiment/"+courseid;
        if(courseid==6||courseid==7||courseid==8){
            var dataStr='expdata=' + getTableContent('tableDataRecord') + '&log=' + document.getElementById('expLog').innerText + '&tableid='+tableid+ '&year='+year+'&code=' + encodeURIComponent($('#virtualInstrumentCodeArea').val());
        }
        else {
            var dataStr='expdata=' + getTableContent('tableDataRecord') + '&log=' + document.getElementById('expLog').innerText + '&tableid='+tableid+ '&year='+year;
        }
        $.ajax({
            type: 'POST',
            async: false,
            url: urlStr,
            data: dataStr,
            success: function (data) {
                if (data=="none")
                    alert('用户不存在数据表');
                else if (data.affectedRows!= 0) alert('上传成功');
            },
            error: function (data) {
                alert('上传失败');
            }
        });
    }
}

//开始记录
$("#buttonStartRecord").click(function (e) {
    startRecord();
});
var isRecordingTable = false;
function startRecord(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        isRecordingTable = !isRecordingTable;
        document.getElementById("buttonStartRecord").innerText = isRecordingTable ? "停止记录" : "开始记录";
        if (isRecordingTable) recordExpLog('开始记录数据,间隔:' + recordInterval + 's');
        else recordExpLog('停止记录数据');
    }
}

//暂停曲线
var isDrawingGraph = true;
$('#buttonPauseGraph').click(function (e) {
    pauseGraph();
});
function pauseGraph(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        isDrawingGraph = !isDrawingGraph;
        document.getElementById("buttonPauseGraph").innerText = isDrawingGraph ? "暂停曲线" : "开始曲线";
    }
}
//重置代码
function resetScript(){
    $("#virtualInstrumentCodeArea").val("").focus();
    //重新加载,刷新页面
    //document.getElementById('instrumentScript').contentWindow.location.reload();
}

$("#virtualInstrumentCodeArea").keydown(function (e) {
    //KeyDown()功能:检查用户是否按了键盘上指定的键
    if (e.keyCode === 9) { // tab was pressed
        var start = this.selectionStart;
        var end = this.selectionEnd;
        var $this = $(this);
        var value = $this.val();
        // set textarea value to: text before caret + tab + text after caret
        $this.val(value.substring(0, start) +"\t" +value.substring(end));
        // put caret at right position again (add one for the tab)
        this.selectionStart = this.selectionEnd = start + 1;
        // prevent the focus lose
        e.preventDefault();
    }
});

// 实验记录
function addZero(n) {
    if (n < 10) return "0" + n;
    return n;
}

function openCamera(tableid) {
    switch (tableid) {
        case "0":
            {
                document.getElementById("v1").src = "rtmp://rtmp.open.ys7.com/openlive/73933847faa847cbba01a05314d59e09";
                document.getElementById("v2").src = "http://hls.open.ys7.com/openlive/73933847faa847cbba01a05314d59e09.m3u8";
            }
            break;
        case "1":
            {
                document.getElementById("v1").src = "rtmp://rtmp.open.ys7.com/openlive/ac6f44e94cd448328e9df3e21d2f0ae8";
                document.getElementById("v2").src = "http://hls.open.ys7.com/openlive/ac6f44e94cd448328e9df3e21d2f0ae8.m3u8";
            }
            break;
        case "2":
            {
                document.getElementById("v1").src = "rtmp://rtmp.open.ys7.com/openlive/f59d741b2206415c8be80e93fc5ad75a";
                document.getElementById("v2").src = "http://hls.open.ys7.com/openlive/f59d741b2206415c8be80e93fc5ad75a.m3u8";
            }
            break;
        case "3":
            {
                document.getElementById("v1").src = "rtmp://rtmp.open.ys7.com/openlive/97ae5cf773d944ed8b7049feed9eb7a4.hd";
                document.getElementById("v2").src = "http://hls.open.ys7.com/openlive/97ae5cf773d944ed8b7049feed9eb7a4.m3u8";
            }
            break;
        case "4":
            {
                document.getElementById("v1").src = "rtmp://rtmp.open.ys7.com/openlive/f418b31e6d704987a17a45ac6e543625";
                document.getElementById("v2").src = "http://hls.open.ys7.com/openlive/f418b31e6d704987a17a45ac6e543625.m3u8";
            }
            break;
    }
    var player = new EZUIPlayer('video-canvas');
    //player.emit('play');
    player.on('error', function () {
        console.log('error');
    });
    player.on('play', function () {
        console.log('play');
    });
    player.on('pause', function () {
        console.log('pause');
    });
}

//日志记录
function recordExpLog(text) {
    var date = new Date();
    var y = date.getFullYear();
    var m = addZero(date.getMonth() + 1);
    var d = addZero(date.getDate());
    var h = addZero(date.getHours());
    var min = addZero(date.getMinutes());
    var s = addZero(date.getSeconds());
    document.getElementById('expLog').innerText += y + "-" + m + "-" + d + "  " + h + ":" + min + ":" + s + "\r\n";
    document.getElementById('expLog').innerText += "<" + text + ">\r\n";
    document.getElementById("expLog").scrollTop = document.getElementById("expLog").scrollHeight; //滚至最底部
}

function getTableContent(id) {
    var mytable = document.getElementById(id);
    var data = [];
    for (var i = 0, rows = mytable.rows.length; i < rows; i++) {
        for (var j = 0, cells = mytable.rows[i].cells.length; j < cells; j++) {
            if (!data[i]) {
                data[i] = new Array();
            }
            data[i][j] = mytable.rows[i].cells[j].innerHTML;
        }
    }
    return data;
}

function WeightError() {
    document.getElementById("WeightError").style.visibility = "visible";
    document.getElementById("WeightError").style.opacity = "0.8";
    document.getElementById("WeightError").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
    document.getElementById("WeightError").style.zIndex = "1000";
    recordExpLog('错误:电子秤采集数据失败');
}

function VortexError() {
    document.getElementById("VortexError").style.visibility = "visible";
    document.getElementById("VortexError").style.opacity = "0.8";
    document.getElementById("VortexError").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
    document.getElementById("VortexError").style.zIndex = "1000";
    recordExpLog('错误:涡街流量计采集数据失败');
}

function LevelError() {
    document.getElementById("LevelError").style.visibility = "visible";
    document.getElementById("LevelError").style.opacity = "0.8";
    document.getElementById("LevelError").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
    document.getElementById("LevelError").style.zIndex = "1000";
    recordExpLog('错误:超声波液位计采集数据失败');
}
function HeatError() {
    document.getElementById("HeatError").style.visibility = "visible";
    document.getElementById("HeatError").style.opacity = "0.8";
    document.getElementById("HeatError").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
    document.getElementById("HeatError").style.zIndex = "1000";
    recordExpLog('错误:超声波流量计(热能表)采集数据失败');
}

//--主实验界面鼠标事件-->
function hideInstrumnts() {
    document.getElementById("UltraSonicFlowmeterLive").style.display = "none";
    document.getElementById("VortexLive").style.display = "none";
}

function hideInstrumentIntroductions() {
    //隐藏所有信息显示窗口
    document.getElementById("UltraSonicFlowmeter").style.visibility = "hidden";
    document.getElementById("UltraSonicFlowmeter").style.opacity = "0";
    document.getElementById("UltraSonicFlowmeter").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("UltraSonicFlowmeter").style.zIndex = "500";

    document.getElementById("UltraSonicDistance").style.visibility = "hidden";
    document.getElementById("UltraSonicDistance").style.opacity = "0";
    document.getElementById("UltraSonicDistance").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("UltraSonicDistance").style.zIndex = "500";

    document.getElementById("VortexMeter").style.visibility = "hidden";
    document.getElementById("VortexMeter").style.opacity = "0";
    document.getElementById("VortexMeter").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("VortexMeter").style.zIndex = "500";
}

function setButtonsByStatus() {
    // 状态1是开始试验
    switch (experimentStatus) {
        case 0:
            document.getElementById("buttonStartExperiment").innerText = "开始实验";
            break;
        case 1:
            document.getElementById("buttonStartExperiment").innerText = "结束实验";
            break;
        case 2:
            document.getElementById("buttonStartExperiment").innerText = "开始实验";
            break;
        default:
            document.getElementById("buttonStartExperiment").innerText = "开始实验";
            experimentStatus = 0;
    }
};

const ULTRAFLOW_X1 = 310;
const ULTRAFLOW_X2 = 370;
const ULTRAFLOW_Y1 = 260;
const ULTRAFLOW_Y2 = 305;//超声波流量计

const ULTRADIST_X1 = 640;
const ULTRADIST_X2 = 680;
const ULTRADIST_Y1 = 90;
const ULTRADIST_Y2 = 140;//超声波液位计

const VORTEX_X1 = 420;
const VORTEX_X2 = 480;
const VORTEX_Y1 = 220;
const VORTEX_Y2 = 300;//涡街流量计

//鼠标移动至相应传感器位置时,显示放大的传感器实时画面
$(document).on("mousemove", "#experiment", function (e) {
    var x = e.offsetX;
    var y = e.offsetY;
    var m_x = x - document.getElementById("experiment").offsetLeft;

    if (m_x > ULTRAFLOW_X1 && m_x < ULTRAFLOW_X2 && y > ULTRAFLOW_Y1 && y < ULTRAFLOW_Y2) {
        document.getElementById("experiment").style.cursor = "Pointer";//鼠标箭头变成小手
        //实时仪器跟踪鼠标
        document.getElementById("UltraSonicFlowmeterLive").style.display = "block";//超声波流量计
        document.getElementById("UltraSonicFlowmeterLive").style.left = (parseInt(x) + 20) + "px";
        document.getElementById("UltraSonicFlowmeterLive").style.top = (parseInt(y) + 20) + "px";
    } else if (m_x > ULTRADIST_X1 && m_x < ULTRADIST_X2 && y > ULTRADIST_Y1 && y < ULTRADIST_Y2) {
        document.getElementById("experiment").style.cursor = "Pointer";

    } else if (m_x > VORTEX_X1 && m_x < VORTEX_X2 && y > VORTEX_Y1 && y < VORTEX_Y2) {//涡街流量计
        document.getElementById("experiment").style.cursor = "Pointer";

        document.getElementById("VortexLive").style.display = "block";
        document.getElementById("VortexLive").style.left = (parseInt(x) + 20) + "px";
        document.getElementById("VortexLive").style.top = (parseInt(y) - 100) + "px";
    } else {
        hideInstrumnts();
        document.getElementById("experiment").style.cursor = "Default";

    }
});
// 点击实验界面相应位置时,弹框显示传感器原理界面
$(document).on("click", "#experiment", function (e) {
    var x = e.offsetX;
    var y = e.offsetY;
    x = x - document.getElementById("experiment").offsetLeft;
    if (x > ULTRAFLOW_X1 && x < ULTRAFLOW_X2 && y > ULTRAFLOW_Y1 && y < ULTRAFLOW_Y2) {
        hideInstrumnts();
        hideInstrumentIntroductions();
        document.getElementById("UltraSonicFlowmeter").style.visibility = "visible";
        document.getElementById("UltraSonicFlowmeter").style.opacity = "1";
        document.getElementById("UltraSonicFlowmeter").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
        document.getElementById("UltraSonicFlowmeter").style.zIndex = "1000";
    } else if (x > ULTRADIST_X1 && x < ULTRADIST_X2 && y > ULTRADIST_Y1 && y < ULTRADIST_Y2) {
        hideInstrumnts();
        hideInstrumentIntroductions();
        document.getElementById("UltraSonicDistance").style.visibility = "visible";
        document.getElementById("UltraSonicDistance").style.opacity = "1";
        document.getElementById("UltraSonicDistance").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
        document.getElementById("UltraSonicDistance").style.zIndex = "1000";

    } else if (x > VORTEX_X1 && x < VORTEX_X2 && y > VORTEX_Y1 && y < VORTEX_Y2) {
        hideInstrumnts();
        hideInstrumentIntroductions();
        document.getElementById("VortexMeter").style.visibility = "visible";
        document.getElementById("VortexMeter").style.opacity = "1";
        document.getElementById("VortexMeter").style.transition = "visibility 0s, opacity 0.2s ease-in-out";
        document.getElementById("VortexMeter").style.zIndex = "1000";

    } else {
        hideInstrumentIntroductions();
    }
});

//警告确认按钮
function overflow() {
    document.getElementById("WarningOverflow").style.visibility = "hidden";
    document.getElementById("WarningOverflow").style.opacity = "0";
    document.getElementById("WarningOverflow").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("WarningOverflow").style.zIndex = "500";
};

//电子秤采集失败确认按钮
$(document).on("click", "#WeightOK", function (e) {
    document.getElementById("WeightError").style.visibility = "hidden";
    document.getElementById("WeightError").style.opacity = "0";
    document.getElementById("WeightError").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("WeightError").style.zIndex = "500";
});
//涡街流量计采集失败确认按钮
$(document).on("click", "#VortexOK", function (e) {
    document.getElementById("VortexError").style.visibility = "hidden";
    document.getElementById("VortexError").style.opacity = "0";
    document.getElementById("VortexError").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("VortexError").style.zIndex = "500";
});
//超声波液位计采集失败确认按钮
$(document).on("click", "#LevelOK", function (e) {
    document.getElementById("LevelError").style.visibility = "hidden";
    document.getElementById("LevelError").style.opacity = "0";
    document.getElementById("LevelError").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("LevelError").style.zIndex = "500";
});
//热能表采集数据失败确认按钮
$(document).on("click", "#HeatOK", function (e) {
    document.getElementById("HeatError").style.visibility = "hidden";
    document.getElementById("HeatError").style.opacity = "0";
    document.getElementById("HeatError").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("HeatError").style.zIndex = "500";
});

//提示确认按钮
$(document).on("click", "#resetFinishedOK", function (e) {
    document.getElementById("WarningResetFinished").style.visibility = "hidden";
    document.getElementById("WarningResetFinished").style.opacity = "0";
    document.getElementById("WarningResetFinished").style.transition = "visibility 0s ease-in-out 0.2s,opacity 0.2s ease-in-out";
    document.getElementById("WarningResetFinished").style.zIndex = "500";
});

// 实时视频显示窗口              
var max = false;
$(document).on("click", "#liveVideo", function (e) {
    max = !max;
    if (max) {
        document.getElementById("liveVideo").style.width = "1112px";
        document.getElementById("liveVideo").style.height = "800px";
        document.getElementById("liveVideo").style.left = "234px";

    } else {
        document.getElementById("liveVideo").style.width = "293px";
        document.getElementById("liveVideo").style.height = "181px";
        document.getElementById("liveVideo").style.left = "1053px";

    }
});
var sw1Status = 0, sw2Status = 0, sw3Status = 0,sw4Status = 0;
// 记录按键的动作 socket.emit发送命令和数据，另一端用socket.on接收

function changeSw1(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        sw1Status = 1;
        socket.emit('controlValves', 'in', tableid, !document.getElementById('sw1').checked);//阀A 被选中返回真 即数据1 
        recordExpLog(document.getElementById('sw1').checked ? '打开进水阀' : '关闭进水阀');
    }
}
function changeSw2(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        sw2Status = 1;
        socket.emit('controlValves', 'side', tableid, !document.getElementById('sw2').checked);//阀门C
        recordExpLog(document.getElementById('sw2').checked ? '打开侧阀' : '关闭侧阀');
    }
}
function changeSw3(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        sw3Status = 1;
        socket.emit('controlValves', 'out', tableid, !document.getElementById('sw3').checked);
        recordExpLog(document.getElementById('sw3').checked ? '打开出水阀' : '关闭出水阀');
    }//阀门B
}
function changeSw4(){
    if (experimentStatus == 0) {
        alert("请先点击开始实验");
        return false;
    }
    else if (experimentStatus == 2) {
        alert("请先点击开始实验");
        return false;
    }
    else {
        sw4Status = 1;
        if (document.getElementById('sw4').checked)
            socket.emit('controlPump', tableid, document.getElementById('frequencySlider').value);
        else
            socket.emit('controlPump', tableid, 0);
        recordExpLog(document.getElementById('sw4').checked ? ('开启变频器,频率:' + document.getElementById('frequencySlider').value + 'Hz') : '关闭变频器');
    }
}

$(document).on("click", "#sw1", function (e) {
    changeSw1();
});
$(document).on("click", "#sw2", function (e) {
    changeSw2();
});
$(document).on("click", "#sw3", function (e) {
    changeSw3();
});
$(document).on("click", "#sw4", function (e) {
    changeSw4();
});

function changeFreq(){
    updateFrequencyValue();
    if (document.getElementById('sw4').checked) {
        socket.emit('controlPump', tableid, document.getElementById('frequencySlider').value);
        recordExpLog('调节变频器频率:' + document.getElementById('frequencySlider').value + 'Hz');
    }
}
$('#frequencySlider').change(function () {
    changeFreq();
})

//表格更新时间间隔
function recordIntervalChange() {
    var interval = parseInt($("#inputSampleInterval").val());
    if (isNaN($("#inputSampleInterval").val())) document.getElementById("inputSampleInterval").value = 1;
    if (interval > 10) document.getElementById("inputSampleInterval").value = 10;
    if (interval < 1) document.getElementById("inputSampleInterval").value = 1;
    recordInterval = parseInt($("#inputSampleInterval").val());
    recordIntervalCounter = recordInterval;
}

function updateFrequencyValue() {
    //改变滑动条外观
    document.getElementById("sValidRange").style.width = document.getElementById("frequencySlider").value * 3 + "px";
    document.getElementById('labelFrequency').innerHTML = document.getElementById('frequencySlider').value + ' Hz';
    document.getElementById('labelFrequencySide').innerHTML = document.getElementById('frequencySlider').value + ' Hz';

}
//重置实验后清空曲线
function chartReset() {
    if (courseid == 0 || courseid == 1) {
        chartWeight.series[0].remove();
        chartFlow.series[0].remove();
        chartInverter.series[0].remove();
        chartWeight.addSeries(createEmptySeries());
        chartFlow.addSeries(createEmptySeries());
        chartInverter.addSeries(createEmptySeries());
    }
    if (courseid == 2) {
        chartLevel.series[0].remove();
        chartLevel.series[0].remove();
        chartInverter.series[0].remove();
        chartLevel.addSeries(createEmptySeries('#5555aa', '实际液位'));
        chartLevel.addSeries(createEmptySeries('#aaaa55', '超声波液位'));
        chartInverter.addSeries(createEmptySeries());
    }
    if (courseid == 3) {
        chartFlow.series[0].remove();
        chartFlow.series[0].remove();
        chartInverter.series[0].remove();
        chartFlow.addSeries(createEmptySeries('#5555aa', '实际流量'));
        chartFlow.addSeries(createEmptySeries('#aaaa55', '涡街流量计流量'));
        chartInverter.addSeries(createEmptySeries());
    }
    if (courseid == 4) {
        chartFlow.series[0].remove();
        chartFlow.series[0].remove();
        chartInverter.series[0].remove();
        chartFlow.addSeries(createEmptySeries('#5555aa', '实际流量'));
        chartFlow.addSeries(createEmptySeries('#aaaa55', '超声波流量'));
        chartInverter.addSeries(createEmptySeries());
    }
    if (courseid == 5) {
        chartLevel.series[0].remove();
        chartULevel.series[0].remove();
        chartLevel.addSeries(createEmptySeries());
        chartULevel.addSeries(createEmptySeries());
    }
    if (courseid == 6 || courseid == 7) {
        chartLevel.series[0].remove();
        chartLevel.series[0].remove();
        chartLevel.addSeries(createEmptySeries('#5555aa', '实际瞬时流量'));
        chartLevel.addSeries(createEmptySeries('#aaaa55', '二次仪表计算流量'));
    }
    if (courseid == 8) {
        chartLevel.series[0].remove();
        chartLevel.series[0].remove();
        chartLevel.addSeries(createEmptySeries('#5555aa', '实际液位'));
        chartLevel.addSeries(createEmptySeries('#aaaa55', '二次仪表计算液位'));
    }
}

function LeastSquare(x, y) {
    var t1 = 0;
    var t2 = 0;
    var t3 = 0;
    var t4 = 0;
    for (var i = 0; i < x.length; i++) {
        console.log(x[i]);
        t1 += x[i] * x[i];
        t2 += Number(x[i]);
        t3 += x[i] * y[i];
        t4 += Number(y[i]);
    }
    a = (t3 * (x.length) - t2 * t4) / (t1 * (x.length) - t2 * t2);
    b = (t1 * t4 - t2 * t3) / (t1 * x.length - t2 * t2);
    return Number(a);
}