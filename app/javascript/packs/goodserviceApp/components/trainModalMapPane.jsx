import React from 'react';
import { Responsive, Checkbox, Header } from 'semantic-ui-react';
import TrainMapStop from './trainMapStop.jsx';

class TrainModalMapPane extends React.Component {
  state = { displayProblems: true }

  handleToggleChange = (e, {checked}) => {
    this.setState({displayProblems: checked});
  }

  calculateStops() {
    const { routing } = this.props;
    const southStops = {};
    const northStops = {};

    if (!routing) {
      return;
    }

    routing.routings.south.forEach((r) => {
      r.forEach((obj) => {
        const stopId = obj.substring(0, 3);
        southStops[stopId] = true;
      });
    });
    routing.routings.north.forEach((r) => {
      r.forEach((obj) => {
        const stopId = obj.substring(0, 3);
        northStops[stopId] = true;
      });
    }); 

    return {southStops: southStops, northStops: northStops};
  }

  generateSegments() {
    const { routing } = this.props;

    if (!routing ) {
      return;
    }

    const southRoutings = routing.routings.south.map((obj) => {
      return obj.map((stop) => {
        return stop.substring(0, 3);
      });
    });

    const northRoutings = routing.routings.north.map((obj) => {
      return obj.map((stop) => {
        return stop.substring(0, 3);
      }).reverse();
    });

    const allRoutings = southRoutings.concat(northRoutings).sort((a, b) => {
      return b.length - a.length ;
    });

    const line = allRoutings[0];

    if (!line) {
      return;
    }

    const lineCopy = [...line];
    const branches = [lineCopy];

    const remainingRoutings = [];

    allRoutings.forEach((lineObj) => {
      if (lineObj.every(val => line.includes(val))) {
        return;
      }
      let lastMatchingStop = null;
      let stopsToBeAdded = [];

      lineObj.forEach((stop) => {
        if (line.includes(stop)) {
          if (stopsToBeAdded.length) {
            const currStopPosition = line.indexOf(stop);

            if (!lastMatchingStop) {
              const matchingBranchToAppend = branches.find((obj) => {
                return obj.indexOf(stop) == 0;
              })

              if (matchingBranchToAppend) {
                const branchStartPosInLine = line.indexOf(matchingBranchToAppend[0]);
                line.splice(branchStartPosInLine, 0, ...stopsToBeAdded);
                matchingBranchToAppend.splice(0, 0, ...stopsToBeAdded);
              } else {
                // branch from the top
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                stopsToBeAdded.push(stop)
                branches.push(stopsToBeAdded);
              }
            } else {
              const branchToInsert = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition > -1 && currMatchingStopPosition > -1 && (currMatchingStopPosition - prevMatchingStopPosition) === 1;
              });
              const branchToPrependBeginning = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition == -1 && currMatchingStopPosition == 0;
              });

              const branchToAppendEnd = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition == (obj.length - 1) && currMatchingStopPosition == -1;
              });

              if (branchToInsert) {
                // adding intermediate stops
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                const lastMatchingStopPositionInBranch = branchToInsert.indexOf(lastMatchingStop);
                branchToInsert.splice(lastMatchingStopPositionInBranch + 1, 0, ...stopsToBeAdded);
              } else if (branchToPrependBeginning) {
                // prepend to beginning of a branch
                line.splice(currStopPosition - 1, 0, ...stopsToBeAdded);
                stopsToBeAdded.splice(0, 0, lastMatchingStop);
                branchToPrependBeginning.splice(0, 0, ...stopsToBeAdded);
              } else if (branchToAppendEnd) {
                // append to end of a branch
                const linePos = line.indexOf(lastMatchingStop);
                line.splice(linePos + 1, 0, ...stopsToBeAdded);
                stopsToBeAdded.push(stop);
                branchToAppendEnd.splice(branchToAppendEnd.length - 1, 0, ...stopsToBeAdded);
              } else {
                // adding middle branch
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                stopsToBeAdded.splice(0, 0, lastMatchingStop);
                stopsToBeAdded.push(stop);
                branches.push(stopsToBeAdded);
              }
            }
          }
          stopsToBeAdded = [];
          lastMatchingStop = stop;
        } else {
          stopsToBeAdded.push(stop);
        }
      });

      if (stopsToBeAdded.length) {
        if (lastMatchingStop === line[line.length - 1]) {
          // append to end of line
          line.splice(line.length, 0, ...stopsToBeAdded);
          branches[0].splice(branches[0].length - 1, 0, ...stopsToBeAdded);
        } else {
          // branch from the bottom
          if (lastMatchingStop) {
            const lastMatchingStopPosition = line.indexOf(lastMatchingStop);
            line.splice(lastMatchingStopPosition + 1, 0, ...stopsToBeAdded);
            stopsToBeAdded.splice(0, 0, lastMatchingStop);
          } else {
            line.push("");
            line.splice(line.length, 0, ...stopsToBeAdded);
          }
          branches.push(stopsToBeAdded);
        }
      }
    });

    return {
      line: line,
      branches: branches
    };
  }

  calculateProblemSections() {
    const { train } = this.props;
    const delays = [];
    const notGoods = [];

    const northLinesDirections = train.north.map((obj) => {
      return {
        name: obj.name,
        parent_name: obj.parent_name,
        max_actual_headway: obj.max_actual_headway,
        max_scheduled_headway: obj.max_scheduled_headway,
        delay: obj.delay,
        travel_time: obj.travel_time,
        first_stops: obj.last_stops,
        last_stops: obj.first_stops
      };
    });

    const southLineDirections = train.south.map((obj) => {
      return {
        name: obj.name,
        parent_name: obj.parent_name,
        max_actual_headway: obj.max_actual_headway,
        max_scheduled_headway: obj.max_scheduled_headway,
        delay: obj.delay,
        travel_time: obj.travel_time,
        first_stops: obj.first_stops,
        last_stops: obj.last_stops
      };
    });
    
    northLinesDirections.forEach((obj) => {
      if (obj.delay >= 5) {
        delays.push(obj);
      } else if (obj.max_scheduled_headway && (obj.max_actual_headway - obj.max_scheduled_headway > 2) || obj.travel_time >= 0.25) {
        notGoods.push(obj);
      }
    });

    southLineDirections.forEach((obj) => {
      if (obj.delay >= 5) {
        delays.push(obj);
      } else if (obj.max_scheduled_headway && (obj.max_actual_headway - obj.max_scheduled_headway > 2) || obj.travel_time >= 0.25) {
        notGoods.push(obj);
      }
    });

    delays.forEach((obj) => {
      let toBeRemoved;
      if (toBeRemoved = notGoods.find((o) => obj.parent_name === o.parent_name)) {
        notGoods.splice(notGoods.indexOf(toBeRemoved), 1);
      }
    });


    return delays.map((obj) => {
      obj["problem"] = "delay";
      return obj;
    }).concat(notGoods.map((obj) => {
      obj["problem"] = "not good";
      return obj;
    }));
  }

  render() {
    const { width, routing, routingTimestamp, stops } = this.props;
    const { displayProblems } = this.state;
    const segments = this.generateSegments();
    const stopPattern = this.calculateStops();
    const problemSections = this.calculateProblemSections();
    let currentBranches = [0];
    let currentProblemSection = null;
    let currentProblemTop = null;
    let currentProblemBottom = null;
    if (segments) {
      return(
        <div>
          <Checkbox toggle onChange={this.handleToggleChange} label={<label className="toggle-label">Highlight issues</label>} defaultChecked />
          <ul style={{listStyleType: "none", textAlign: "left", width: (width > Responsive.onlyMobile.maxWidth && "700px"), margin: "auto", padding: 0}}>
            {
              segments.line.map((stopId, lineIndex) => {
                let branchStart = null;
                let branchEnd = null;
                let branchStops = [];
                let count = 0;
                const stop = stops[stopId];
                const transfers = stop && stop.trains.filter(route => route.id != routing.id);
                const currentMaxBranch = currentBranches[currentBranches.length - 1];

                if (stopId === "") {
                  segments.branches.splice(0, 1);
                  currentBranches = [0];
                  currentProblemSection = null;
                  currentProblemTop = null;
                  currentProblemBottom = null;
                } else {
                  if (!currentProblemBottom) {
                    currentProblemTop = null;
                  }

                  if (currentProblemSection) {
                    currentProblemTop = currentProblemBottom;
                    if (currentProblemSection.last_stops.map((obj) => obj.substring(0, 3)).includes(stopId)) {
                      if (!segments.line.slice(lineIndex + 1).some(
                        (lineStop) => currentProblemSection.last_stops.map((obj) => obj.substring(0, 3)).includes(lineStop))
                      ) {
                        currentProblemSection = null;
                        currentProblemBottom = null;
                      }
                    }
                  }

                  if (!currentProblemSection) {
                    let potentialProblemSection;
                    if (potentialProblemSection = problemSections.find((obj) => {
                      return obj.first_stops.map((stop) => stop.substring(0, 3)).includes(stopId);
                    })) {
                      currentProblemSection = potentialProblemSection;
                      currentProblemBottom = currentProblemSection.problem;
                      problemSections.splice(problemSections.indexOf(potentialProblemSection), 0);
                    }
                  }

                  const potentialBranch = segments.branches.find((obj, index) => {
                    return !currentBranches.includes(index) && obj.includes(stopId);
                  });
                  if (potentialBranch) {
                    const potentialBranchIndex = segments.branches.indexOf(potentialBranch);
                    const currentBranchIncludesStop = currentBranches.find((obj) => {
                      return segments.branches[obj].includes(stopId);
                    });
                    const branchesToTraverse = [...currentBranches];
                    if (currentBranchIncludesStop || currentBranchIncludesStop === 0) {
                      branchStart = currentBranchIncludesStop;
                      segments.branches[potentialBranchIndex].splice(0, 1);
                    } else {
                      branchesToTraverse.push(potentialBranchIndex);
                    }

                    branchesToTraverse.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                    currentBranches.push(potentialBranchIndex);
                  } else if (currentBranches.length > 1 &&
                      (segments.branches[currentMaxBranch][segments.branches[currentMaxBranch].length - 1] === stopId) &&
                      segments.branches[currentBranches[currentBranches.length - 2]].includes(stopId)) {
                    branchEnd = currentBranches[currentBranches.length - 2];

                    currentBranches.pop();
                    // branch back
                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                  } else if (currentBranches.length > 1 && segments.branches[currentMaxBranch].length === 0) {
                    // branch ends
                    currentBranches.pop();

                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                  } else {
                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                  }
                }
                const activeBranches = branchStops.map((isStopping, index) => {
                  return isStopping || segments.branches[index].length > 0;
                });
                return (
                  <TrainMapStop key={stopId} stop={stop} color={routing.color} southStop={stopPattern.southStops[stopId]}
                    northStop={stopPattern.northStops[stopId]} transfers={transfers} branchStops={branchStops} branchStart={branchStart}
                    branchEnd={branchEnd} activeBranches={activeBranches} width={width} problemSection={displayProblems && currentProblemSection}
                    displayProblemTop={displayProblems && currentProblemTop} displayProblemBottom={displayProblems && currentProblemBottom} />
                )
              })
            }
          </ul>
          <Header inverted as='h5' textAlign='right'>
            Last updated {new Date(routingTimestamp).toLocaleTimeString('en-US')}<br />
          </Header>
        </div>
      )
    }
    return (<div></div>)
  }
}
export default TrainModalMapPane