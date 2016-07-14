//Basic Game Information
var gameState = {
	go: true,
	victory: null,
	words: 0,
	//points are letters, but when displayed are *1000
	points: 0,
	missedWords: 0,
	wave: 0,
	enemies: 0,
	difficulty: 2000,
	timeStart: 0,
	timeEnd: 0,
	endWaveTrigger: false,
	secondsPerWave: 20,
	wordsPerWave: 20, 
	timeLeft: 20,
	statusCheck: true

}

var gameTotals = {
	words: 0,
	points: 0,
	missedWords: 0,
	finalWave: 0,
	enemies: 0,
	timeElapsed: 0
}

//invader images/ticker
var invadertic = 0;
var boomaudiotic = 0;
var invaders = [
"static/assets/images/space_invader1.gif",
"static/assets/images/space_invader2.gif",
"static/assets/images/space_invader3.gif"
]

//Holds api words
var wordBank = [];
//Holds words on screen
var activeBank = [];
//Holds words that have been used
var usedBank = [];
//needed for end game makeships, used in the newwordlifecycle losegame portion
var endGameRows = [0,0,0,0,0,0,0,0,0];
//this is the ticker for ships on the gameover screen. scope was increased so I can stop making ships earlier instead of waiting for the full animation
var stopMakingShips = 0;
//holds the bonus words
var bonusWords = [];

////////////////////////////////////////////////////////////////
//ajax call to begin everything
var URL = "http://api.wordnik.com:80/v4/words.json/randomWords?hasDictionaryDef=true&excludePartOfSpeech=proper-noun&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=3&maxLength=10&limit=1000&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5"

$.ajax({url: URL, success: function(result){

	for(zzz = 0;zzz < result.length;zzz++){

		var pushWordTemp = true;

		for(yyy = 0;yyy<result[zzz].word.length;yyy++){

			if(result[zzz].word[yyy] >= 'a' && result[zzz].word[yyy] <= 'z'){
			  	if(yyy==result[zzz].word.length -1 && pushWordTemp == true)
			  	wordBank.push(result[zzz]);
			}else{
				// console.log("rejected", result[zzz].word);
				pushWordTemp = false;
			}
		}
	}

	console.log("Gameloop starts", wordBank);
	//opens up the modal automatically, but only if the ajax is successful
	openModal();

}});
/////////////////////////////////////////////////////////////////////////////
//sets up the jquery targets
$(document).ready(function(){
	$SearchField = $('#query');		// 	the text field. This is where the game is played.
	$targets = $('.wordTargetDetails');	//	the word targets. Each one will have the class "wordTarget."

	// var debounced_tableFilter = _.debounce(wordGun, 200);
	// var throttle_tableFilter = _.throttle(wordGun, 500);
	$SearchField.keyup(function(){
		wordGun(this);
	});

//create new divs button
	$('.makediv').click(function(){

		// console.log("pushMe");

		// this takes the contents of the input box
		var inputContents = $('.box').val();

		// console.log(inputContents, inputContents.length);

		//contains the new rod lifecycle
		newWordLifeCycle(inputContents, null);

	});

	playAudioIntro('play');

});//end document.ready

/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
// removes words
function wordGun(node){

	$targets = $('.wordTarget');

	// console.log('wordGun called');

	//on keyup, look at the #query id box word
	var myInput = $SearchField.val();

	// console.log('myInput: ', myInput);

	//regex???
	var val = '^(?=.*\\b' + $.trim($(node).val()).split(/\s+/).join('\\b)(?=.*\\b') + ').*$',
        reg = RegExp(val, 'i'),
        // search_results = [],		//debugging purposes only, this can be removed since counters are now keeping track of results.
        
        targetCounter = 0,
        text;

		$targets.each(function(){
			//gets the text from the targets
			var targetWord = $(this).text();
			console.log("targetWord", targetWord);
			//look for spaces in the text, if there is a group of them, make them blank???

			var text = $(this).text();//.replace(/\s+/g, ' ');
			
			// checks how many characters were selected?
			var inputSoFar = $SearchField.val().length;
			
			if(reg.test(text) === true){
				targetCounter++;

				//makes a var that is the part fo the word that matches your word
				var inputHighlight = targetWord.slice(inputSoFar);
				
				//rewrites the word as "what i've input" + what is left
				$(this).html("<em>" +  myInput + "</em>" + inputHighlight);

				// this marks the completion of a typed word and
				if($SearchField.val() == targetWord){

					console.log("bang");
					//nulls that spot in the activeBank/adds to usedbank
					activeBank[activeBank.indexOf(targetWord)] = null;
					usedBank.push(targetWord);

					//blanks the word input
					$SearchField.val('');
					//removes the animation div
					$(this).closest('.wordTargetDetails').remove();

					//gamestate bookkeeping
					gameState.points += targetWord.length;
					gameState.words++;

					gameHeaderUpdate();

					console.log('gamestatuscheck');
					console.log('gameState.wave', gameState.wave);

					gameStatusCheck();
					
					playAudioZap('play');
				}

			} 
		});
	// }
};

// new code to capture enter keypress and do some stuff
$("#query").keyup(function(event){
	console.log('enter1');
    if(event.keyCode == 13){
		console.log('enter2');
		if($('#query').val() != "" && gameState.go == true){
	        bonusWords.push($("#query").val());
			$("#query").val('');
			console.log(bonusWords);
		}
    }
});

//probably unnecessary - zintis
// $(document).keyup(function(event){
//     if(gameState.go == false){
// 		console.log('enter3');
//     	// $('.start').click();
//     	gameState.go = true;
//     }
// });

// what does this do? -zintis
// $('.noEnterSubmit').keypress(function(e){
//     if ( e.which == 13 ) return false;
// });

/////////////////////////////////////////////////////////////////////////////

//this starts an interval which selects words, checks if you've lost, or won
function gameLoop(xxyy){
	//this is the timer per round
	setTimeout(function(){
		gameState.endWaveTrigger = true;
	},gameState.secondsPerWave*1000);

	var gameClock = setInterval(function(){
		console.log(gameState.timeLeft);
		gameState.timeLeft--;
		$('#waveTime').html(gameState.timeLeft);
		if(gameState.timeLeft <= 0 || gameState.go == false){
			$('#waveTime').html(0);
			clearInterval(gameClock);
		}
	}, 1000);

	playAudioAliens('play');

	var gameLoopInterval = setInterval(function(){
		//checks of the game is over
		if(gameState.endWaveTrigger == true){
			gameStatusCheck();
			clearInterval(gameLoopInterval);
		}else{
			selectWord();
		}	
	}, xxyy);

/////////////////////////////////////////////////////////////////////////////////THIS CODE IS FOR THE UNITS DESTROYED VERSION
	// var gameLoopInterval = setInterval(function(){
	// 	//checks of the game is over
	// 	if(gameState.go==false && gameState.victory == false){
	// 		clearInterval(gameLoopInterval);
	// 	}else if(gameState.victory == true && gameState.go ==true){
	// 		clearInterval(gameLoopInterval);
	// 	}else{
	// 		selectWord();
	// 	}	
	// }, xxyy);
///////////////////////////////////////////////////////////////////////


}
/////////////////////////////////////////////////////////////////////////////
function selectWord(){

		var xxx = Math.floor(Math.random() * wordBank.length);
		newWordLifeCycle(wordBank[xxx].word, null);
		wordBank.splice(xxx, 1);
}
/////////////////////////////////////////////////////////////////

//this function will contain the new word lifecycle
function newWordLifeCycle(inputContents, time){

	console.log("inputContents", inputContents);
	if(time == null){time = inputContents.length;}

	//this finds the row that has no word in it currently
	var activeRow;
	var possibleRows = [];

	//a) game is going, figure out what rows have words b)game is not going, append a div 9 times into each row
	if(gameState.go == true){
		for(tic = 0;tic<9;tic++){
			if(activeBank[tic]==null){
				possibleRows.push(tic);
			}
		}
	}else if (gameState.go == false){
		for(tic = 0;tic<9;tic++){
			if(endGameRows[tic]<9){
				possibleRows.push(tic);
			}
		}
	}

	//randomly selected row
	activeRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
	//drops the word in the corresponding activeBank slot
	activeBank[activeRow] = inputContents;

	//this code randomizes the movement type tag on the moving div
	random123 = Math.floor((Math.random() * 5)+1);
	var randomSpeed;
	switch(random123){
		case 1: randomSpeed = 'word-x1';
		break;
		case 2: randomSpeed = 'word-x2';
		break;
		case 3: randomSpeed = 'word-x3';
		break;
		case 4: randomSpeed = 'word-x4';
		break;
		case 5: randomSpeed = 'word-x5';	
		break;
		default: console.log("switch error");
	}

	//end game? append you lose and tick up activerow
	//game? drop word, and activate explosion trigger
	if(inputContents == "You Lose!"){
		//this makes it so that each row gets 9 ships
		endGameRows[activeRow]++;
		//randomizes speed
		var tempRandomNumber = Math.floor((Math.random() * 8)+2);
		$('#row' + activeRow).append('<div class="center wordTargetDetails wordTargetAnimate'+ tempRandomNumber +' '+randomSpeed+' white"><div class="center"><img class="z3" width="35" height="35" src="'+invaders[invadertic]+'"></div><p class="wordTarget">'+inputContents+'</p></div>');
		invaderSwap();
	}else{
		gameState.enemies++;
		//this line creates the dynamic div that contains the word and a randomized alien image
		$('#row' + activeRow).html('<div class="center wordTargetDetails wordTargetAnimate'+inputContents.length +' '+randomSpeed+' white"><div class="center"><img class="z3" width="35" height="35" src="'+invaders[invadertic]+'"></div><p class="wordTarget">'+inputContents+'</p></div>');
		//switch invader gif image
		invaderSwap();

		//explosion gif
		explosionTrigger(time, activeRow, inputContents);
	}
}

/////////////////////////////////////////////////////////////////

function explosionTrigger(time, row, word){

	setTimeout(function(){

			if(activeBank[row] == word){
				activeBank[row] = null;
				gameState.missedWords++;
				gameHeaderUpdate();
				
				//make explosion gif, is stopped by another settimeout
				$('#row' + row).html('<img class="explosion z3" src="static/assets/images/explosion.gif">');

				playAudioBoom('play');

				//show explosion if game is still going


				//if you miss 5 words then...
				if (gameState.missedWords>=5){
					gameState.victory = false;
					gameState.go=false;
					playAudioLoss('play');
					playAudioAliens('pause');
					gameStatusCheck();

				}else{
					
					//this ends the explosion div by blanking the corresponding row
					setTimeout(function(){
						$('#row' + row).html("");
					}, 500);

					// this is just a delayed data removal
					activeBank[row] = null;
				}
			}

		// this sets the timer and the speed relative to the length of the word, +2
	}, time*1000+2);
}

//causes the end game if true triggered by finishing word
function gameStatusCheck(){

	if(gameState.go == true && gameState.endWaveTrigger == true && gameState.missedWords < 6 && gameState.statusCheck == true){
		gameState.timeEnd = new Date();
		gameState.victory = true;
		gameState.statusCheck = false;
		endWave();
	}else if(gameState.missedWords >= 5 && gameState.statusCheck == true){
		gameState.go = false;
		gameState.victory = false;
		gameState.timeEnd = new Date();
		gameState.statusCheck = false;
		gameOver();
	}
////////////////////////////////////////////////////////////////////////////// THIS CODE IS FOR THE UNITS DESTROYED VERSION
	// if(gameState.go == true && gameState.words >= gameState.wordsPerWave && gameState.missedWords < 6){
	// 	gameState.timeEnd = new Date();
	// 	gameState.victory = true;
	// 	endWave();
	// }else if(gameState.missedWords >= 5){
	// 	gameState.go = false;
	// 	gameState.victory = false;
	// 	gameState.timeEnd = new Date();
	// 	gameOver();
	// }
//////////////////////////////////////////////////////////////////////

}

/////////////////////////////////////////////////////////
//beginning of game countdown, triggered by red modal button
function gameStart(){


	stopMakingShips = 82;
	clearAllRows();
	//difficulty level housekeeping
	gameState.wave++;
	gameHeaderUpdate();
	//this is to avoid conflicts with the lose game function, not sure if necessary -zintis

	//sets countdown timer
	var x = 4;
	var countdown321 = setInterval(function(){
		x --;
		if (x==0){
			//writes the GO!
			playAudio321go('play');
			$('#row4').html('<h1 class="centerAligning wordTargetAnimate50 word-x2 white">GO!</h1>');	
			//2nd half of animation
			setTimeout(function(){
				$('#row4').html('<h1 class="centerAligning wordTargetAnimate51 word-x2 white">GO!</h1>');
				
			},600);
		}else if (x < 0){
			$('#row4').empty();
			clearInterval(countdown321);
			gameReset();//zzzzz
			gameLoop(gameState.difficulty);

			gameState.timeStart = new Date(); 

		}else{
			//does the loop countdown
			playAudio321('play');
			$('#row4').html('<h1 class="centerAligning wordTargetAnimate50 word-x2 white">'+x+'</h1>');
			//2nd half of animation
			setTimeout(function(){
				$('#row4').html('<h1 class="centerAligning wordTargetAnimate51 word-x2 white">'+x+'</h1>');
			},600);
		}
	}, 1000);
}

//makes 81 ships in a grid. most of the logic is in "newwordlifecycle"
function gameOver(){
	gameState.endWaveTrigger = true;
	tempTimeLog();
	clearAllRows();
	stopMakingShips = 0;
	$('.start').html("TRY AGAIN");
	var makingLoserShips = setInterval(function(){
		stopMakingShips++;
		console.log(gameState,gameTotals);
		if(stopMakingShips > 81){
			showStats();
			openModal();
			// setTimeout(function(){
			// 	chachachaching();
			// }, 1000);
			clearInterval(makingLoserShips);
			gameState.go = false;
		}
		newWordLifeCycle("You Lose!", null);
	},25);	
}	

//begin a new wave, start the game. it actually gets called in game.hbs right now (7/11/16)
function startWave(x){
	if(gameState.victory == false){
		console.log("false victory, full reset");
		fullReset();
	}else{
		console.log("true victory, partial reset");
		gameReset();	
	}
	$('#waveNum').html(gameState.wave);
	gameState.go = true;
	gameStart();
}

//this is the victory function
function endWave(){
	gameState.endWaveTrigger = true;
	gameState.difficulty = Math.floor(gameState.difficulty * .9);
	tempTimeLog();
	playAudioAliens('pause');
	playAudioWin('play');
	clearAllRows();
	activeBank = [];
	//zzzzzzzzzzzzzzzzz not sure about removed usedbank clear
	// usedBank = [];

	//conditional loop victory statement 3 outcomes depending on gamestate.victory
	if(gameState.victory == true){
		var endWaveTicker = 0;
		$('#row4').html('<div id="victoryTable" class=" white"></div>');
		$('.completed').html(" Completed!");
		for(j = 0;j<8;j++){
			setTimeout(function(){
					var completed = "Victory!"
					// console.log(completed[endWaveTicker]);
					$('#victoryTable').append('<em class="fakeH1 wordTargetAnimate50 word-x2 white">'+completed[endWaveTicker]+'</em>');
					endWaveTicker++;
			}, j*200);
		}
	}else if(gameState.victory == false){
		$('.completed').html("Defeated!");
	}else{
		$('.completed').html("");
	}

	//pulls up the modal
	setTimeout(function(){
		$('.justWave').html("Wave: ");
		$('#waveNum').html(gameState.wave);

		showStats();
		openModal();
		// setTimeout(function(){
		// 	chachachaching();
		// }, 1000);
		$('#row4').html("");
	},3500)

}

//////////////////////////////////////////////////////////////////////
//helper functions////////////////////////////////////////////////////

//resets basic stats
function gameReset(){
	gameState.go = true;
	gameState.words = 0;
	gameState.missedWords = 0;
	gameState.victory = false;
	gameState.timeStart = 0;
	gameState.timeEnd = 0;
	gameState.endWaveTrigger = false;
	gameState.timeLeft = 20;
	gameState.statusCheck = true;

	gameHeaderUpdate();

}

function fullReset(){

	console.log("gameTotals", gameTotals);

	gameState.go = true;
	gameState.victory = null;
	gameState.vords = 0;
	gameState.points = 0;
	gameState.missedWords = 0;
	gameState.wave = 0;
	gameState.enemies = 0;
	gameState.difficulty = 2000;
	gameState.endWaveTrigger = false;
	gameState.timeLeft = 20;
	gameState.statusCheck = true;


	gameTotals.words = 0;
	gameTotals.points =  0;
	gameTotals.missedWords = 0;
	gameTotals.finalWave = 0;
	gameTotals.enemies = 0;

	invadertic = 0;
	activeBank = [];
	usedBank = [];
	endGameRows = [0,0,0,0,0,0,0,0,0];



	$('.start').html("I AM READY");

	// showStats();
	gameHeaderUpdate();

}

function invaderSwap(){
	if(invadertic == 0){
		invadertic++;
	}else if (invadertic == 1){
		invadertic++;
	}else if (invadertic == 2){
		invadertic=0;
	}
}

function clearAllRows(){
	for(u = 0; u < 10; u++){
		$("#row" + u).html('');
	}
}

//this writes all your stats into the modal
function showStats(){

	//sets the message to player depending on gamestate
	var winLoseBanana;//true/false/null var
	var tempStats = [];//holds the stats being shown
	pushStats();//applies this rounds stats to your totals

	//this sets the stats depending on if you won or lost (or neither)
	switch(gameState.victory){
		case true: 
			winLoseBanana = "Victory!";
			tempStats[0] = gameState.points;
			tempStats[1] = gameState.enemies;
			tempStats[2] = gameState.words;
			tempStats[3] = gameState.missedWords;

		break;
		case false: 
			winLoseBanana = "Defeat!";
			tempStats[0] = gameTotals.points;
			tempStats[1] = gameTotals.enemies;
			tempStats[2] = gameTotals.words;
			tempStats[3] = gameTotals.missedWords;

		break;
		default: winLoseBanana = ""; tempStats = [0,0,0,0];
		break;
	}
	//write all the temporarily held stats into the modal
	$('.messageToPlayer').html("");
	$('.waveNum').html(gameState.wave);
	$('.messageToPlayer').append("<h5><em>"+winLoseBanana+"</em></h5>" );
	$('.messageToPlayer').append("<tr><td><h5><em>Points:</em></td><td class='tdpad'><h5>"+tempStats[0]*200*(5-gameState.missedWords)+"</h5></td></tr>" );
	$('.messageToPlayer').append("<tr><td><h5><em>Enemies:</em></td><td class='tdpad'><h5>" +tempStats[1]+"</h5></td></tr>" );
	$('.messageToPlayer').append("<tr><td><h5><em>Enemies Destroyed:</em></td><td class='tdpad'><h5>" +tempStats[2]+"</h5></td></tr>" );
	$('.messageToPlayer').append("<tr><td><h5><em>Damage:</em></td><td class='tdpad'><h5>" +tempStats[3]+"</h5></td></tr>");	
}

// this collects your combined round data, it's called by showStats
function pushStats(){
	gameTotals.words += gameState.words;
	gameTotals.points += 200*gameState.points * (5 - gameState.missedWords);
	gameTotals.missedWords += gameState.missedWords;
	gameTotals.finalWave = gameState.wave;
	gameTotals.enemies +=  gameState.enemies;
	gameTotals.timeElapsed +=  gameState.timeEnd - gameState.timeStart;
}

function openModal(){
	console.log(gameState.difficulty);
	modal.style.display = 'block';
}

function closeModal(){
	modal.style.display = 'none';
}

function gameHeaderUpdate(){
	$('#waveNum').html(gameTotals.wave);
	$('#score').html(gameTotals.points);
	$('#words').html(gameState.words);
	$('#missed').html(gameState.missedWords);

	//change city indicator
	switch(gameState.missedWords){
		case 0:$('.cityIcon').attr('src', 'static/assets/images/city5.png');
			break;
		case 1:$('.cityIcon').attr('src', 'static/assets/images/city4.png');
			break;
		case 2:$('.cityIcon').attr('src', 'static/assets/images/city3.png')
			break;
		case 3:$('.cityIcon').attr('src', 'static/assets/images/city2.png')
			break;
		case 4:$('.cityIcon').attr('src', 'static/assets/images/city1.png')
			break;
		case 5:$('.cityIcon').attr('src', 'static/assets/images/city0.png')
			break;
		default: 
			break;
	}
}

function tempTimeLog(){//temporary function to check time
	console.log("timestart", gameState.timeStart);
	console.log("end", gameState.timeEnd);
	console.log("totals", gameTotals.timeElapsed);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//audio code, grabs audio from the .hbs file, assigns functions to play it, and volumn

var AUDboom = document.getElementById("boom");
var AUDboom2 = document.getElementById("boom2");
var AUDboom3 = document.getElementById("boom3");
var AUDaliens = document.getElementById("aliens");
var AUDzap = document.getElementById("zap");
var AUD321 = document.getElementById("321");
var AUD321go = document.getElementById("321go");
var AUDwin = document.getElementById("win");
var AUDloss = document.getElementById("loss");
var AUDintro = document.getElementById("appear");
var AUDchacha = document.getElementById("chacha");
var AUDching = document.getElementById("ching");

//this function will play different explosion tracks depending on whether other explosion tracks are playing
function playAudioBoom() { 

	switch(boomaudiotic){
		case 0:
			boomaudiotic++;		
			AUDboom.play();
			break;
		case 1:
			boomaudiotic++;		
			AUDboom2.play();
			break;
		case 2:
			boomaudiotic=0;		
			AUDboom3.play();
			break;
	}
} 

// points ticker in modal
// function chachachaching(){
// 	playAudioChaCha('play');
// 	console.log(gameState.points, gameState.missedWords);
// 	var tempTarget = 200*gameState.points * (5 - gameState.missedWords);
// 	console.log("tempTarget", tempTarget);

// 	for(z=1;z<=tempTarget;z++){

// 		$('#chachachachingpoints').html(z);

// 		if(z >= tempTarget){

// 			playAudioChaCha('pause');

// 			playAudioChing('play');
// 		}
// 	}
// }

///////////////////////////////////////////////////////////////////////
//audio bank
function playAudioChaCha(x) { 
	if(x=="play"){
	    AUDchacha.play(); 
	}else if(x=="pause"){
		AUDchacha.pause();
	}
} 

function playAudioChing(x) { 
	if(x=="play"){
	    AUDching.play(); 
	}else if(x=="pause"){
		AUDching.pause();
	}
} 

function playAudioAliens(x) { 
	if(x=="play"){
  	 	AUDaliens.play(); 
	}else if(x=="pause"){
		AUDaliens.pause();
	}
} 
function playAudioZap(x) { 
	if(x=="play"){
	    AUDzap.play(); 
	}else if(x=="pause"){
		AUDzap.pause();
	}
} 
//countdown sounds
function playAudio321(x) { 
	if(x=="play"){
		setTimeout(function(){
		    AUD321.play()
		},375); 
	}else if(x=="pause"){
		AUD321.pause();
	}
} 
function playAudio321go(x) { 
	if(x=="play"){
		setTimeout(function(){
			// console.log("timeout");
		    AUD321go.play()
		},375); 
	}else if(x=="pause"){
		AUD321go.pause();
	}
} 
//victory sounds
function playAudioWin(x) { 
	if(x=="play"){
	    AUDwin.play(); 
	}else if(x=="pause"){
		AUDwin.pause();
	}
} 
function playAudioLoss(x) { 
	if(x=="play"){
	    AUDloss.play(); 
	}else if(x=="pause"){
		AUDloss.pause();
	}
} 

function playAudioIntro(x) { 
	// console.log("audintro");
	if(x=="play"){
	    AUDintro.play(); 
	}else if(x=="pause"){
		AUDintro.pause();
	}
} 

AUDboom.volume = .2;
AUDboom2.volume = .2;
AUDboom3.volume = .2;
AUDaliens.volume = .01;
AUDzap.volume = .2;
AUD321.volume = .2;
AUD321go.volume = .2;
AUDwin.volume = 1;
AUDloss.volume = 1;
AUDintro.volume = 1;

//this function is unused
function isPlaying(x){console.log(x+".paused", x.paused);return !x.paused;}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

