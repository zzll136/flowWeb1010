//对score表的操作均写在此文件中
var pool = require('./config');

var DB_NAME = 'flowweb1011';
function User(user) { //创建User对象
    this.username = user.username;
    this.userpass = user.userpass;
};
module.exports = User;

//1先将用户和实验id等信息insert表score中,根据用户实验预约次数计算预约得分和实验次数得分,满分为10分
User.getOrdertimes = function getOrdertimes(user_id, year, courseid, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        var select_Sql = "select * from score where user_id=? and year=? and courseid=?";
        connection.query(select_Sql, [user_id, year, courseid], function (err, result1) {
            if (err) {
                console.log("getOrdertimes_Sql Error: " + err.message);
            }
            if (result1.length == 0) {
                var insertscore_Sql = "insert into score(user_id, year,courseid) values(?,?,?)";
                connection.query(insertscore_Sql, [user_id, year, courseid], function (err, result2) {
                    if (err) {
                        console.log("insertscore_Sql Error: " + err.message);
                    }
                })
            }
            var getOrdertimes_sql = "select * from new_ordertime where user_id=? and year=?";
            connection.query(getOrdertimes_sql, [user_id, year], function (err, result3) {
                var ordertimes = [0, 0, 0];
                var orderscore = 10;
                var timescore = 10;
                for (var i = 0; i < result3.length; i++) {
                    if (result3[i].doif == 0) ordertimes[0]++;//0表示失约
                    if (result3[i].doif == 1) ordertimes[1]++;//1表示正常
                    if (result3[i].doif == 2) ordertimes[2]++;//2表示迟到
                }
                orderscore = orderscore - ordertimes[0] * 2 - ordertimes[2] * 1;//预约的分数
                if ((ordertimes[1] + ordertimes[2]) > 9) timescore = 10 - (ordertimes[1] + ordertimes[2] - 9) * 2;
                if (orderscore < 0) orderscore = 0;
                if (timescore < 0) timescore = 0;
                if ((ordertimes[1] + ordertimes[2]) == 0) timescore = 0;
                var updatescore_Sql = "UPDATE score SET misstimes= ?,normaltimes = ?,latetimes=?,orderscore=?,timescore=? where user_id=? and year= ? and courseid= ? ";
                connection.query(updatescore_Sql, [ordertimes[0], ordertimes[1], ordertimes[2], orderscore, timescore, user_id, year, courseid], function (err, results) {
                    if (err) {
                        console.log("updatescore_Sql Error: " + err.message);
                    }
                    if (!connection.isRelease) {
                        connection.release();
                    }
                });
                console.log("score invoked[updatescore_Sql]");
                callback(err, result3);
            });
        });
    });
};

//2根据用户实验次数，实验时间,实验日志,实验数据并分析
User.getexp_timespanscore = function getexp_timespanscore(user_id, year, courseid, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        var getexp_timespanscore_Sql = "select startTime,endTime,explog,repData,stu_a,stu_b,code from experiment where user_id=? and year=? and courseid=?";
        connection.query(getexp_timespanscore_Sql, [user_id, year, courseid], function (err, result1) {
            if (err) {
                console.log("getexp_timespanscore_Sql Error: " + err.message);
            }
            var timespanscore = 0;
            var operationScore = 0;
            var dataScore = 0;
            var timespan = 0;
            var explog_record = "";
            var data_record = "";
            var stu_a, stu_b;
            var sys_a, sys_b;
            if (result1[0].startTime && result1[0].endTime) {
                var res = getTimeSpanscore(result1[0].startTime, result1[0].endTime);
                timespan = res[0];
                timespanscore = res[1];
            }
            if (result1[0].explog) {
                if (courseid == 2 || courseid == 5 || courseid == 8) { var result = getOperationscoreInlevel(result1[0].explog); }
                else { var result = getOperationscore(result1[0].explog); }
                operationScore = result[0];
                explog_record = result[1];
            }
            if (result1[0].repData) {
                if (courseid == 0 || courseid == 1) {
                    try {
                        var repdataArray = result1[0].repData.split(",");
                        var VortexFlow = [];
                        var weight = [];
                        var time = [];
                        var freq = [];
                        if (repdataArray[5]) { freq.push(repdataArray[5]); dataScore = 40; }
                        for (var i = 9; i < repdataArray.length; i = i + 4) {
                            if (repdataArray[i] != repdataArray[i - 4] && repdataArray[i] != 0)
                                freq.push(repdataArray[i]);
                        }
                        for (var j = 0; j < freq.length; j++) {
                            for (var i = 4; i < repdataArray.length; i = i + 4) {
                                if (repdataArray[i + 1] == freq[j]) {
                                    var data = repdataArray[i];
                                    var ge = 0;
                                    var shi = 0;
                                    var miao = 0;
                                    if (data) {
                                        var ge = Number(data.substring(1, 2));
                                        var shi = Number(data.substring(0, 1));
                                        var miao = Number(data.substring(data.length - 2, data.length));
                                    }
                                    repdataArray[i] = (shi * 10 + ge) * 60 + miao;
                                    time.push(repdataArray[i]);
                                    repdataArray[i + 2] = Number(repdataArray[i + 2]) * 3.6;
                                    weight.push(repdataArray[i + 2]);
                                    VortexFlow.push(repdataArray[i + 3]);
                                }
                            }
                            if (time.length && weight.length) {
                                var parameter = LeastSquare2(time, weight);
                                var parameterArray = parameter.split(";");
                                sys_a = Number(parameterArray[0]).toFixed(2);
                                sys_b = Number(parameterArray[1]).toFixed(2);
                                var k = average(VortexFlow);
                                if (Math.abs(sys_a - k) > 0.2) {
                                    dataScore = dataScore - 5;
                                    data_record = data_record + "变频器频率为" + freq[j] + "时,液体体积_时间曲线为y=" + sys_a + "*x+(" + sys_b + "),数据误差太大;";
                                }
                                else if (Math.abs(sys_a - k) > 0.1) {
                                    dataScore = dataScore - 2;
                                    data_record = data_record + "变频器频率为" + freq[j] + "时，液体体积_时间曲线为y=" + sys_a + "*x+(" + sys_b + ")数据误差较大;";
                                }
                                else data_record = data_record + "变频器频率为" + freq[j] + "时，液体体积_时间曲线为y=" + sys_a + "*x+(" + sys_b + ")数据良好;";
                                time = [];
                                weight = [];
                                VortexFlow = [];
                            }
                        }
                    } catch (e) {
                        console.log("dataHandle course01--------error");
                    };
                }
                if (courseid == 2) {
                    try {
                        var repdataArray = result1[0].repData.split(",");
                        var actualLevel = [];
                        var ultrasonicLevel = [];
                        if (repdataArray.length > 4) dataScore = 40;
                        for (var i = 4; i < repdataArray.length; i = i + 4) {
                            actualLevel.push(repdataArray[i + 2]);
                            ultrasonicLevel.push(repdataArray[i + 3]);
                        }
                        if (actualLevel.length && ultrasonicLevel.length) {
                            var pearsonPara = caculatePearson(actualLevel, ultrasonicLevel);
                            if (Math.abs(pearsonPara) < 0.5) {
                                dataScore = 0;
                                data_record = data_record + "曲线皮尔斯相关系数为" + pearsonPara + ",数据误差过大,请重新做实验";
                            }
                            else if (Math.abs(pearsonPara) < 0.8) { 
                                dataScore = dataScore - 5;
                                data_record = data_record + "曲线皮尔斯相关系数为" + pearsonPara + ",数据误差较大;";
                            }
                            else if (Math.abs(pearsonPara) < 0.98) {
                                dataScore = dataScore - 2;
                                data_record = data_record + "曲线皮尔斯相关系数为" + pearsonPara + ",数据误差较大;";
                            }
                            else data_record = data_record + "曲线皮尔斯相关系数为" + pearsonPara + ",数据良好;";
                            // var parameter = LeastSquare2(actualLevel, ultrasonicLevel);
                            // var parameterArray = parameter.split(";");
                            // sys_a = Number(parameterArray[0]).toFixed(2);
                            // sys_b = Number(parameterArray[1]).toFixed(2);
                            // if (Math.abs(sys_a - 1) > 0.2) {
                            //     dataScore = dataScore - 5;
                            //     data_record = data_record + "超声波液位_实际液位曲线为y=" + sys_a + "*x+(" + sys_b + "),数据误差太大;";
                            // }
                            // else if (Math.abs(sys_a - 1) > 0.1) {
                            //     dataScore = dataScore - 2;
                            //     data_record = data_record + "超声波液位_实际液位曲线为y=" + sys_a + "*x+(" + sys_b + "),数据误差较大;";
                            // }
                            // else data_record = data_record + "超声波液位_实际液位曲线为y=" + sys_a + "*x+(" + sys_b + "),数据良好;";
                        }
                    }
                    catch (e) {
                        console.log("dataHandle course2--------error");

                    }
                }
                if (courseid == 3 || courseid == 4 || courseid == 5) {
                    try {
                        var repdataArray = result1[0].repData.split(",");
                        var actFlow = [];
                        var VortexFlow = [];
                        if (repdataArray.length > 4) dataScore = 40;
                        for (var i = 6; i < repdataArray.length; i = i + 4) {
                            actFlow.push(repdataArray[i]);
                            VortexFlow.push(repdataArray[i + 1]);
                        }
                        //最小二乘法
                        if (actFlow.length && VortexFlow.length) {
                            var parameter = LeastSquare2(actFlow, VortexFlow);
                            console.log("parameter的值" + parameter);
                            var parameterArray = parameter.split(";");
                            sys_a = parameterArray[0];
                            sys_a = Number(sys_a).toFixed(4);

                            sys_b = parameterArray[1];
                            sys_b = Number(sys_b).toFixed(4);
                            console.log("线性方程y=" + sys_a + "*x+" + sys_b);
                        }
                        stu_a = result1[0].stu_a;
                        stu_b = result1[0].stu_b;
                        if (Math.abs(sys_a - 1) > 0.2) { dataScore -= 5; data_record += "由实验数据得到的校准曲线，斜率的误差值偏大;"; }
                        if (stu_a && stu_b) {
                            if (Math.abs(sys_a - stu_a) <= 0.2 && Math.abs(sys_b - stu_b) <= 5) { data_record += "校准曲线方程为y=" + sys_a + "*x+" + sys_b + "，提交的参数基本正确;"; }
                            else if (Math.abs(sys_a - stu_a) <= 0.2 && Math.abs(sys_b - stu_b) > 10) { dataScore -= 5; data_record += "参数误差较大，可重新提交;"; }
                            else if (Math.abs(sys_a - stu_a) > 0.2 && Math.abs(sys_b - stu_b) <= 10) { dataScore -= 5; data_record += "参数误差较大，可重新提交;"; }
                            else { dataScore -= 10; data_record = "参数误差太大，请重新提交;"; }
                        }
                        else { dataScore = 0; data_record += "未填写校准曲线方程参数;"; }
                    } catch (e) { console.log("dataHandle course345--------error"); };
                }
                if (courseid == 6 || courseid == 7) {
                    try {
                        var repdataArray = result1[0].repData.split(",");
                        var VortexFlow = [];
                        var actFlow = [];
                        var error = 0;
                        if (repdataArray.length > 4) dataScore = 40;
                        var calculate = [];
                        var standard = [];
                        for (var i = 6; i < repdataArray.length; i = i + 4) {
                            calculate.push(Number(repdataArray[i]));
                            standard.push(Number(repdataArray[i + 1]));
                        }
                        error = sim_distance(calculate, standard);
                        // for (var i = 6; i < repdataArray.length; i = i + 4) {
                        //     error += Math.abs(Number(repdataArray[i]) - Number(repdataArray[i + 1]));
                        // }
                        // error = (error / repdataArray.length).toFixed(4);
                        data_record += "二次仪表计算值与标准值的平均误差为" + error + ";";
                        //if (error < 0.1) {
                        if (error < 0.2) {
                            data_record = data_record + "平均误差很小;";
                        }
                        else if (error < 0.7) {    
                            dataScore = (-10 * error + 42).toFixed(0);
                            data_record = data_record + "平均误差较大;";
                        }
                        else {
                            dataScore = 0;
                            data_record = data_record + "平均误差极大，请重新实验;";
                        }
                    }
                    catch (e) {
                        console.log("dataHandle course67--------error");
                    }
                }
                if (courseid == 8) {
                    try {
                        var repdataArray = result1[0].repData.split(",");
                        var actLevel = [];
                        var ultrasonicLevel = [];
                        if (repdataArray.length > 4) dataScore = 40;
                        for (var i = 6; i < repdataArray.length; i = i + 4) {
                            actLevel.push(repdataArray[i]);
                            ultrasonicLevel.push(repdataArray[i + 1]);
                        }
                        //最小二乘法
                        if (actLevel.length && ultrasonicLevel.length) {
                            var parameter = LeastSquare2(actLevel, ultrasonicLevel);
                            var parameterArray = parameter.split(";");
                            sys_a = Number(parameterArray[0]).toFixed(4);
                            sys_b = Number(parameterArray[1]).toFixed(4);
                            data_record = "线性方程为y=" + sys_a + "*x+" + sys_b;
                            var error = Math.abs(sys_a - 1.0);
                            if (error <= 0.1) {
                                data_record = data_record + "数据曲线的线性良好;";
                            }
                            else if (error < 2.0) {
                                dataScore = (-20 * error + 40).toFixed(0);
                                data_record = data_record + "数据曲线的线性较差;";
                            }
                            else {
                                dataScore = 0;
                                data_record = data_record + "数据曲线的线性极差;";
                            }
                        }
                    }
                    catch (e) {
                        console.log("dataHandle course8--------error");

                    }
                }
            }
            if (dataScore < 0) dataScore = 0;
            var insertscore_Sql = "UPDATE score SET timespan=?,timespanscore=?,operationScore=?,dataScore=?,explogRecord=?,dataRecord=?,stu_a=?,stu_b=?,sys_a=?,sys_b=? where user_id=? and year = ? and courseid= ? ";
            connection.query(insertscore_Sql, [timespan, timespanscore, operationScore, dataScore, explog_record, data_record, stu_a, stu_b, sys_a, sys_b, user_id, year, courseid], function (err, result2) {
                if (err) {
                    console.log("insertscore_Sql Error: " + err.message);
                }
                if (!connection.isRelease) {
                    connection.release();
                }
            });
            console.log("score invoked[getexp_timespanscore]");
            callback(err, result1);
        });
    });
};

//3计算自动评分的值，并从数据库获取老师的评分，然后计算最终得分，写入数据库
User.countAutoscore = function countAutoscore(user_id, year, courseid, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        var countAutoscore_Sql = "select * from score where user_id=? and year=? and courseid=?";
        connection.query(countAutoscore_Sql, [user_id, year, courseid], function (err, result) {
            if (err) {
                console.log("countAutoscore_Sql Error: " + err.message);
            }
            var autoscore = result[0].orderscore + result[0].timescore + result[0].timespanscore + result[0].operationScore + result[0].dataScore;
            var getTeascore_sql = "select teascore from experiment where user_id=? and courseid=? and year=?";
            connection.query(getTeascore_sql, [user_id, courseid, year], function (err, result1) {
                if (err) {
                    console.log("getTeascore_sql Error: " + err.message);
                }
                var score = autoscore * 0.5 + result1[0].teascore * 0.5;
                var insertautoscore_Sql = "UPDATE experiment SET autoscore=?,score=? where user_id=? and year = ? and courseid= ? ";
                connection.query(insertautoscore_Sql, [autoscore, score, user_id, year, courseid], function (err, results) {
                    if (err) {
                        console.log("change_Sql Error: " + err.message);
                    }
                    if (!connection.isRelease) {
                        connection.release();
                    }
                });
            });
            console.log("score invoked[countAutoscore]");
            callback(err, result);
        });
    });
};

//最小二乘法函数
function LeastSquare1(x, y) {
    var t1 = 0;
    var t2 = 0;
    var t3 = 0;
    var t4 = 0;
    for (var i = 0; i < x.length; i++) {
        t1 += x[i] * x[i];
        t2 += Number(x[i]); //x的多项和
        t3 += x[i] * y[i];
        t4 += Number(y[i]);//y的多项和
    }
    a = (t3 * (x.length) - t2 * t4) / (t1 * (x.length) - t2 * t2);
    b = (t1 * t4 - t2 * t3) / (t1 * x.length - t2 * t2);
    return a + ";" + b;
}

//最小二乘法函数
function LeastSquare2(x, y) {
    var xsum = 0;
    var ysum = 0;
    for (var i = 0; i < x.length; i++) {
        xsum += Number(x[i]); //x的多项和
        ysum += Number(y[i]);//y的多项和
    }
    var xmean = xsum / x.length;//x的平均数
    var ymean = ysum / x.length;//y的平均数
    var num = 0;//多项式和【(x-x的均值)*(y-y的均值)】
    var den = 0;//多项式和【(x-x的均值)*(x-x的均值)】
    for (var i = 0; i < x.length; i++) {
        var x = Number(x[i]);
        var y = Number(y[i]);
        num += (x - xmean) * (y - ymean);
        den += (x - xmean) * (x - xmean);
    }
    a = num / den;//y=ax+b 的 系数a
    b = ymean - a * xmean;//y=ax+b 的 系数b
    return a + ";" + b;
}

//计算欧氏距离，距离越小相似度越大
function sim_distance(X, Y) {
    var distance = 0;
    if (X.length == Y.length) {
        for (var i = 0; i < Y.length; i++) {
            var temp = Math.pow(Number(X[i]) - Number(Y[i]), 2);
            distance += temp;
        }
        distance = Math.sqrt(distance);
    }
    distance = distance.toFixed(4);
    return distance;
}

function caculatePearson(X, Y) {
    var sumXY = 0;
    var sumX = 0;
    var sumY = 0;
    var sumPowX = 0;
    var sumPowY = 0;
    for (var i = 0; i < X.length; i++) {
        var x = Number(X[i]);
        if (x == null) {
            x = 0;
        }
        var y = Number(Y[i]);
        if (y == null) {
            y = 0;
        }
        sumXY += x * y;
        sumX += x;
        sumY += y;
        sumPowX += Math.pow(x, 2);
        sumPowY += Math.pow(y, 2);
    }
    var n = X.length;
    var pearson = (sumXY - sumX * sumY / n) / Math.sqrt((sumPowX - Math.pow(sumX, 2) / n) * (sumPowY - Math.pow(sumY, 2) / n));
    pearson = pearson.toFixed(2);
    return pearson;
}
//求平均值的函数
function average(x) {
    var count = 0;
    for (var i = 0; i < x.length; i++) {
        count = count + Number(x[i]);
    }
    var x_average = (count / (x.length)).toFixed(4);
    return x_average;
}
//计算实验时长的得分
function getTimeSpanscore(start, end) {
    var result = [];
    var startTime = start.substring(14, 16);
    var endTime = end.substring(14, 16);
    var timespan = endTime - startTime;
    if (timespan <= 0) timespanscore = 0;
    else if (timespan < 20) timespanscore = 10;
    else timespanscore = 30 - timespan;
    if (timespanscore < 0) timespanscore = 0;
    result.push(timespan);
    result.push(timespanscore);
    return result;
}

//计算实验操作的得分
function getOperationscore(explog) {
    var a = new Array(0, 0, 0, 0, 0);//阀门的默认初始状态，进水阀，出水阀，侧阀，变频器的值,是否在记录数据
    // var recordData=0;//用来记录 是否开始记录数据
    var result = [];
    var freqTime = 0;
    var resetTime = 0;
    var sideTime = 0;
    //var operationScore = 25;
    var operationScore = 30;
    var explog_record = "";
    var explogArray = explog.split(">");
    console.log(explogArray);
    for (var i = 0; i < explogArray.length; i++) {
        var obj = explogArray[i].indexOf("<");
        explogTxt = explogArray[i].substring(obj + 1, explogArray[i].length);
        //处理开启变频器的操作
        var freqState = explogTxt.indexOf("开启变频器");
        var changeFreq = explogTxt.indexOf("调节变频器");
        var freqValue = 0;
        if (freqState != -1) {//说明是开启变频器或者调节变频器了
            freqValue = explogTxt.substring(explogTxt.indexOf(":") + 1, explogTxt.length - 2);
            explogTxt = "开启变频器";
        }
        if (changeFreq != -1) {//说明是开启变频器或者调节变频器了
            freqValue = explogTxt.substring(explogTxt.indexOf(":") + 1, explogTxt.length - 2);
            explogTxt = "调节变频器";
        }
        //处理开始记录数据的操作
        var startRecord = explogTxt.indexOf("开始记录数据");
        if (startRecord != -1) {
            explogTxt = "开始记录数据";
        }
        switch (explogTxt) {
            case "开始实验":
                {
                    a[0] = 1;
                    a[3] = 30;
                    freqTime++;
                }
                break;
            case "开启变频器":
                {
                    if (a[0] == 0) {
                        operationScore -= 2;
                        explog_record = explog_record + "打开电机时,进水阀未打开\n";
                    }
                    freqTime++;
                    a[3] = freqValue;

                }
                break;
            case "调节变频器":
                {
                    if (a[3] != 0) {//只有变频器是开着的，才有用，这里0表示变频器是关着的。
                        if (a[0] == 0) {
                            operationScore -= 2;
                            explog_record = explog_record + "打开电机时,进水阀未打开\n";
                        }
                        freqTime++;
                        a[3] = freqValue;
                    }
                }
                break;
            case "关闭变频器":
                {
                    a[3] = 0;
                }
                break;
            case "重置实验":
                {
                    a[0] = 0;
                    a[1] = 1;
                    a[2] = 0;
                    a[3] = 0;
                    freqTime = 0;
                    sideTime = 0;
                    resetTime++;
                }
                break;
            case "重置实验完成,水箱已放空":
                {
                    a[1] = 0;
                }
                break;
            case "重置后开始实验":
                {
                    a[0] = 1;
                    a[3] = 30;
                    freqTime++;
                }
                break;
            case "警告:上储水箱溢出,电子秤超重":
                {
                    a[1] = 1;
                }
                break;
            case "打开进水阀":
                {
                    a[0] = 1;
                }
                break;

            case "关闭进水阀":
                {
                    if (a[3] != 0) {
                        operationScore -= 2;
                        explog_record = explog_record + "关闭进水阀时，电机未关闭\n";
                    }
                    a[0] = 0;
                }
                break;
            case "打开出水阀":
                {
                    if (a[4] == 1) {
                        operationScore -= 1;
                        explog_record = explog_record + "记录数据过程中，误开出水阀\n";
                    }
                    a[1] = 1;
                }
                break;
            case "关闭出水阀":
                {
                    a[1] = 0;
                }
                break;

            case "打开侧阀":
                {
                    sideTime++;
                    a[2] = 1;
                }
                break;
            case "关闭侧阀":
                {
                    a[2] = 0;
                }
                break;
            case "开始记录数据":
                {
                    if (a[1] != 0) {
                        operationScore -= 1;
                        explog_record = explog_record + "出水阀打开情况下，开始记录数据\n";
                    }
                    a[4] = 1;//表示开始记录数据了
                }
                break;
            case "停止记录数据":
                {
                    a[4] = 0;//表示当前是停止记录数据的阶段
                }
                break;
            default: console.log("无用操作");
        }
    }
    if (resetTime > 1) {
        operationScore = operationScore + 1 - resetTime;
        explog_record = explog_record + "重置实验" + resetTime + "次\n";
    }
    if (sideTime > 0) {
        operationScore = operationScore - sideTime;
        explog_record = explog_record + "实验中打开侧阀" + sideTime + "次\n";
    }
    // if (freqTime > 3) {
    //     operationScore = operationScore + 5;
    // }
    // else if (freqTime == 2) {
    //     operationScore = operationScore + 2;
    //     explog_record = explog_record + "可尝试变频器在多频率下进行实验\n";
    // }
    // else { explog_record = explog_record + "未尝试变频器在多频率下进行实验\n"; }
    if (operationScore < 0) operationScore = 0;
    result.push(operationScore);
    result.push(explog_record);
    return result;
}
//验证实验的前两页都测试过，是没什么问题的。

//液位计实验不用考虑记录数据时机的问题
function getOperationscoreInlevel(explog) {
    var a = new Array(0, 0, 0, 0, 0);//阀门的默认初始状态，进水阀，出水阀，侧阀，变频器的值,是否在记录数据
    var result = [];
    var freqTime = 0;
    var resetTime = 0;
    var sideTime = 0;
    //var operationScore = 25;
    var operationScore = 30;
    var explog_record = "";
    var explogArray = explog.split(">");
    console.log(explogArray);
    for (var i = 0; i < explogArray.length; i++) {
        var obj = explogArray[i].indexOf("<");
        explogTxt = explogArray[i].substring(obj + 1, explogArray[i].length);
        //处理开启变频器的操作
        var freqState = explogTxt.indexOf("开启变频器");
        var changeFreq = explogTxt.indexOf("调节变频器");
        var freqValue = 0;
        if (freqState != -1) {//说明是开启变频器或者调节变频器了
            freqValue = explogTxt.substring(explogTxt.indexOf(":") + 1, explogTxt.length - 2);
            explogTxt = "开启变频器";
        }
        if (changeFreq != -1) {//说明是开启变频器或者调节变频器了
            freqValue = explogTxt.substring(explogTxt.indexOf(":") + 1, explogTxt.length - 2);
            explogTxt = "调节变频器";
        }
        //处理开始记录数据的操作
        var startRecord = explogTxt.indexOf("开始记录数据");
        if (startRecord != -1) {
            explogTxt = "开始记录数据";
        }
        switch (explogTxt) {
            case "开始实验":
                {
                    a[0] = 1;
                    a[3] = 30;
                    freqTime++;
                }
                break;
            case "开启变频器":
                {
                    if (a[0] == 0) {
                        operationScore -= 2;
                        explog_record = explog_record + "打开电机时,进水阀未打开\n";
                    }
                    freqTime++;
                    a[3] = freqValue;

                }
                break;
            case "调节变频器":
                {
                    if (a[3] != 0) {//只有变频器是开着的，才有用，这里0表示变频器是关着的。
                        if (a[0] == 0) {
                            operationScore -= 2;
                            explog_record = explog_record + "打开电机时,进水阀未打开\n";
                        }
                        freqTime++;
                        a[3] = freqValue;
                    }
                }
                break;
            case "关闭变频器":
                {
                    a[3] = 0;
                }
                break;
            case "重置实验":
                {
                    a[0] = 0;
                    a[1] = 1;
                    a[2] = 0;
                    a[3] = 0;
                    freqTime = 0;
                    sideTime = 0;
                    resetTime++;
                }
                break;
            case "重置实验完成,水箱已放空":
                {
                    a[1] = 0;
                }
                break;
            case "重置后开始实验":
                {
                    a[0] = 1;
                    a[3] = 30;
                    freqTime++;
                }
                break;
            case "警告:上储水箱溢出,电子秤超重":
                {
                    a[1] = 1;
                }
                break;
            case "打开进水阀":
                {
                    a[0] = 1;
                }
                break;

            case "关闭进水阀":
                {
                    if (a[3] != 0) {
                        operationScore -= 2;
                        explog_record = explog_record + "关闭进水阀时，电机未关闭\n";
                    }
                    a[0] = 0;
                }
                break;
            case "打开出水阀":
                {
                    if (a[4] == 1) {
                        operationScore -= 1;
                        explog_record = explog_record + "记录数据过程中，误开出水阀\n";
                    }
                    a[1] = 1;
                }
                break;
            case "关闭出水阀":
                {
                    a[1] = 0;
                }
                break;

            case "打开侧阀":
                {
                    sideTime++;
                    a[2] = 1;
                }
                break;
            case "关闭侧阀":
                {
                    a[2] = 0;
                }
                break;
            case "开始记录数据":
                {
                    // if (a[1] != 0) {
                    //     operationScore -= 1;
                    //     explog_record = explog_record + "出水阀打开情况下，开始记录数据\n";
                    // }
                    a[4] = 1;//表示开始记录数据了
                }
                break;
            case "停止记录数据":
                {
                    a[4] = 0;//表示当前是停止记录数据的阶段
                }
                break;
            default: console.log("无用操作");
        }
    }
    if (resetTime > 1) {
        operationScore = operationScore + 1 - resetTime;
        explog_record = explog_record + "重置实验" + resetTime + "次\n";
    }
    if (sideTime > 0) {
        operationScore = operationScore - sideTime;
        explog_record = explog_record + "实验中打开侧阀" + sideTime + "次\n";
    }
    if (operationScore < 0) operationScore = 0;
    result.push(operationScore);
    result.push(explog_record);
    return result;
}

//计算实验操作的得分（旧版本）
function getOperationscoreOld(explog) {
    var result = [];
    var operationScore = 30;
    var explog_record = "";
    var explogArray = explog.split(">");
    for (var i = 0; i < explogArray.length; i++) {
        var obj = explogArray[i].indexOf("<");
        explogArray[i] = explogArray[i].substring(obj + 1, explogArray[i].length);
    }
    var resetTime = 0;
    // console.log("该次实验的实验操作数组" + explogArray);
    for (var i = 0; i < explogArray.length; i++) {
        if (explogArray[i] == "打开侧阀") {
            operationScore = operationScore - 1;
            explog_record = explog_record + "实验中打开侧阀;"
        }
        if (explogArray[i] == "重置实验") {
            resetTime++;
            // operationScore = operationScore - 1;
            // explog_record = explog_record + "重置实验一次;"
        }
        if (explogArray[i].indexOf("开启变频器") != -1) {
            var j = i;
            for (var m = 0; m < j; m++) {
                var sw1Status = true;//初始状态进水阀是打开的.此时判断最后一次操作是打开进水阀即可？
                if (explogArray[m] == "关闭进水阀") sw1Status = false;
                else if (explogArray[m] == "打开进水阀") sw1Status = true;
            }
            if (!sw1Status) {
                operationScore = operationScore - 2;
                explog_record = explog_record + "打开电机时,进水阀未打开;"
            }
        }

        if (explogArray[i] == "关闭进水阀") {
            var j = i;
            for (var m = 0; m < j; m++) {
                var sw4Status = false;//变频器默认情况下是打开的
                if (explogArray[m] == "关闭变频器") sw4Status = true;
                else if (explogArray[m].indexOf("开启变频器") != -1) sw4Status = false;
            }
            if (!sw4Status) {
                operationScore = operationScore - 2;
                explog_record = explog_record + "关闭进水阀时，电机未关闭;"
            }
        }
    }
    if (resetTime > 1) {
        operationScore = operationScore + 1 - resetTime;
        explog_record = explog_record + "重置实验" + resetTime + "次;";
    }
    if (operationScore < 0) operationScore = 0;
    result.push(operationScore);
    result.push(explog_record);
    return result;
}
